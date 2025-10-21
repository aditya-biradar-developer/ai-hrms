const { supabase } = require('../config/db');

class AssessmentService {
  
  // Save questions based on assessment type
  async saveQuestions(applicationId, assessmentType, questions) {
    console.log(`💾 Saving ${assessmentType} questions for application: ${applicationId}`);
    
    try {
      let tableName;
      let processedQuestions;
      
      switch (assessmentType) {
        case 'aptitude':
          tableName = 'aptitude_questions';
          processedQuestions = questions.map((q, index) => ({
            application_id: applicationId,
            question_text: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty || 'medium',
            time_limit: q.time_limit || 60,
            question_order: index
          }));
          break;
          
        case 'communication':
          tableName = 'communication_questions';
          processedQuestions = questions.map((q, index) => ({
            application_id: applicationId,
            question_text: q.question_text || q.question || q.text || q.content || q.title,
            question_type: q.type || q.question_type,
            section: q.section || q.skill || q.type,
            passage: q.passage || null,
            audio_url: q.audio_url || q.audio_text || null, // Map audio_text to audio_url for compatibility
            instructions: q.instructions || null,
            options: q.options || null,
            correct_answer: q.correct_answer || null,
            evaluation_criteria: q.evaluation_criteria ? JSON.stringify(q.evaluation_criteria) : null,
            time_limit: q.time_limit || 120,
            question_order: index,
            title: q.title || null,
            skill: q.skill || null,
            subtype: q.subtype || null,
            difficulty: q.difficulty || null
          }));
          break;
          
        case 'coding':
          tableName = 'coding_questions';
          processedQuestions = questions.map((q, index) => ({
            application_id: applicationId,
            question_text: q.question,
            problem_description: q.description,
            code_template: q.template || '',
            test_cases: q.test_cases,
            difficulty: q.difficulty || 'medium',
            programming_language: q.language || 'javascript',
            time_limit: q.time_limit || 1800,
            question_order: index
          }));
          break;
          
        default:
          throw new Error(`Unsupported assessment type: ${assessmentType}`);
      }
      
      // Delete existing questions for this application and assessment type
      console.log(`🗑️ Deleting existing ${assessmentType} questions for application ${applicationId}`);
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('application_id', applicationId);
      
      if (deleteError) {
        console.log('⚠️ Delete error (may be OK if no existing questions):', deleteError.message);
      }
      
      console.log(`📝 Inserting ${processedQuestions.length} new questions into ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(processedQuestions);
      
      if (error) {
        console.error(`❌ Error saving ${assessmentType} questions:`, error);
        throw error;
      }
      
      console.log(`✅ ${assessmentType} questions saved successfully`);
      return { success: true, count: processedQuestions.length };
      
    } catch (error) {
      console.error(`❌ Error in saveQuestions for ${assessmentType}:`, error);
      throw error;
    }
  }
  
  // Get questions based on assessment type
  async getQuestions(applicationId, assessmentType) {
    console.log(`📋 Fetching ${assessmentType} questions for application: ${applicationId}`);
    
    try {
      let tableName;
      
      switch (assessmentType) {
        case 'aptitude':
          tableName = 'aptitude_questions';
          break;
        case 'communication':
          tableName = 'communication_questions';
          break;
        case 'coding':
          tableName = 'coding_questions';
          break;
        default:
          throw new Error(`Unsupported assessment type: ${assessmentType}`);
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('application_id', applicationId)
        .order('question_order');
      
      if (error) {
        console.error(`❌ Error fetching ${assessmentType} questions:`, error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} ${assessmentType} questions`);
      return data || [];
      
    } catch (error) {
      console.error(`❌ Error in getQuestions for ${assessmentType}:`, error);
      throw error;
    }
  }
  
  // Save assessment results
  async saveResults(applicationId, assessmentType, results) {
    console.log(`💾 Saving ${assessmentType} results for application: ${applicationId}`);
    
    try {
      const resultData = {
        application_id: applicationId,
        assessment_type: assessmentType,
        overall_score: results.score,
        total_questions: results.total_questions,
        correct_answers: results.correct_answers,
        time_taken: results.time_taken,
        sections_scores: results.sections_scores || null,
        answers: results.answers,
        completed_at: new Date().toISOString()
      };
      
      // Use upsert to handle multiple attempts
      const { data, error } = await supabase
        .from('assessment_results')
        .upsert(resultData, { 
          onConflict: 'application_id,assessment_type',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Error saving ${assessmentType} results:`, error);
        throw error;
      }
      
      console.log(`✅ ${assessmentType} results saved successfully`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error in saveResults for ${assessmentType}:`, error);
      throw error;
    }
  }
  
  // Get all assessment results for an application
  async getAllResults(applicationId) {
    console.log(`📊 Fetching all assessment results for application: ${applicationId}`);
    
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('application_id', applicationId)
        .order('completed_at');
      
      if (error) {
        console.error('❌ Error fetching assessment results:', error);
        throw error;
      }
      
      // Convert to the format expected by frontend
      const results = {};
      data?.forEach(result => {
        results[result.assessment_type] = {
          score: result.overall_score,
          total_questions: result.total_questions,
          correct_answers: result.correct_answers,
          time_taken: result.time_taken,
          sections_scores: result.sections_scores,
          answers: result.answers,
          completed_at: result.completed_at
        };
      });
      
      console.log(`✅ Found results for ${Object.keys(results).length} assessment types`);
      return results;
      
    } catch (error) {
      console.error('❌ Error in getAllResults:', error);
      throw error;
    }
  }
}

module.exports = new AssessmentService();
