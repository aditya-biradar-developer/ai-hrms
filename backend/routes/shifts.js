const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { supabase } = require('../config/db');

const router = express.Router();

/**
 * @route   GET /api/shifts
 * @desc    Get all shifts
 * @access  All authenticated users
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { data: shifts, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.json({
      success: true,
      data: { shifts }
    });
  } catch (error) {
    console.error('❌ Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/shifts
 * @desc    Create new shift
 * @access  Admin, HR
 */
router.post('/', authenticate, authorize(['admin', 'hr']), async (req, res) => {
  try {
    const { name, start_time, end_time, late_threshold_minutes, working_days } = req.body;

    const { data: shift, error } = await supabase
      .from('shifts')
      .insert([{
        name,
        start_time,
        end_time,
        late_threshold_minutes: late_threshold_minutes || 15,
        working_days: working_days || ["Monday","Tuesday","Wednesday","Thursday","Friday"]
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: { shift }
    });
  } catch (error) {
    console.error('❌ Create shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/shifts/assign
 * @desc    Assign shift to user
 * @access  Admin, HR
 */
router.post('/assign', authenticate, authorize(['admin', 'hr']), async (req, res) => {
  try {
    const { user_id, shift_id, effective_from, effective_to } = req.body;

    console.log('🔄 Assigning shift:', { user_id, shift_id, effective_from, effective_to });

    // Delete previous shifts for this user (simpler than deactivate)
    const { error: deleteError } = await supabase
      .from('user_shifts')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) console.log('⚠️ Delete error (might be ok if no previous shift):', deleteError);

    const effectiveDate = effective_from || new Date().toISOString().split('T')[0];
    console.log('📅 Effective date:', effectiveDate);

    // Assign new shift
    const { data: userShift, error } = await supabase
      .from('user_shifts')
      .insert([{
        user_id,
        shift_id,
        effective_from: effectiveDate,
        effective_to
      }])
      .select(`
        *,
        shifts (*)
      `)
      .single();

    console.log('📊 Insert result:', { userShift, error });

    if (error) throw error;

    // Update user's shift timing fields for backward compatibility
    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (shift) {
      await supabase
        .from('users')
        .update({
          shift_start_time: shift.start_time,
          shift_end_time: shift.end_time,
          late_threshold_minutes: shift.late_threshold_minutes
        })
        .eq('id', user_id);
    }

    res.json({
      success: true,
      message: 'Shift assigned successfully',
      data: { userShift }
    });
  } catch (error) {
    console.error('❌ Assign shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign shift',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/shifts/user/:user_id
 * @desc    Get user's current shift
 * @access  Admin, HR, or own shift
 */
router.get('/user/:user_id', authenticate, async (req, res) => {
  try {
    const { user_id } = req.params;

    // Check authorization
    if (user_id !== req.user.id && !['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    console.log('🔍 Fetching shift for user:', user_id, 'today:', today);

    const { data: userShift, error } = await supabase
      .from('user_shifts')
      .select(`
        *,
        shifts (*)
      `)
      .eq('user_id', user_id)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    console.log('📊 Query result:', { userShift, error });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching shift:', error);
      throw error;
    }

    console.log('✅ Returning shift:', userShift ? 'Found' : 'Not found');

    res.json({
      success: true,
      data: { userShift: userShift || null }
    });
  } catch (error) {
    console.error('❌ Get user shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user shift',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/shifts/analytics/:user_id
 * @desc    Get attendance analytics for user
 * @access  Admin, HR, Manager, or own analytics
 */
router.get('/analytics/:user_id', authenticate, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { period = 'month', year, month, week } = req.query;

    // Check authorization
    if (user_id !== req.user.id && !['admin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    let start_date, end_date;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    // Calculate date range based on period
    switch (period) {
      case 'day':
        start_date = end_date = new Date().toISOString().split('T')[0];
        break;
      case 'week':
        const weekNum = week || Math.ceil(new Date().getDate() / 7);
        const firstDay = new Date(currentYear, currentMonth - 1, (weekNum - 1) * 7 + 1);
        const lastDay = new Date(currentYear, currentMonth - 1, weekNum * 7);
        start_date = firstDay.toISOString().split('T')[0];
        end_date = lastDay.toISOString().split('T')[0];
        break;
      case 'month':
        start_date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        end_date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDayOfMonth}`;
        break;
      case 'year':
        start_date = `${currentYear}-01-01`;
        end_date = `${currentYear}-12-31`;
        break;
      default:
        start_date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        end_date = new Date().toISOString().split('T')[0];
    }

    // Call the database function
    const { data: analytics, error } = await supabase
      .rpc('calculate_attendance_percentage', {
        p_user_id: user_id,
        p_start_date: start_date,
        p_end_date: end_date
      });

    if (error) throw error;

    const result = analytics && analytics.length > 0 ? analytics[0] : {
      total_working_days: 0,
      present_days: 0,
      late_days: 0,
      absent_days: 0,
      leave_days: 0,
      attendance_percentage: 0
    };

    res.json({
      success: true,
      data: {
        period,
        start_date,
        end_date,
        analytics: result
      }
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/shifts/working-days
 * @desc    Get working days count for a period
 * @access  All authenticated users
 */
router.get('/working-days', authenticate, async (req, res) => {
  try {
    const { year, month, week } = req.query;
    const currentYear = year || new Date().getFullYear();

    let query = supabase
      .from('working_days_calendar')
      .select('*', { count: 'exact' })
      .eq('year', currentYear)
      .eq('is_working_day', true)
      .eq('is_holiday', false);

    if (month) {
      query = query.eq('month', month);
    }

    if (week) {
      query = query.eq('week_number', week);
    }

    const { data: workingDays, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: {
        year: currentYear,
        month: month || 'all',
        week: week || 'all',
        working_days_count: count,
        working_days: workingDays
      }
    });
  } catch (error) {
    console.error('❌ Get working days error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch working days',
      error: error.message
    });
  }
});

module.exports = router;
