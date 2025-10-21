const nodemailer = require('nodemailer');
const axios = require('axios');

// Email configuration
const createTransporter = () => {
  // Using Gmail SMTP (you can change this to any email service)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD // Your app password
    }
  });
};

// Template email generator (fallback when AI service is unavailable)
const generateTemplateEmail = (emailType, candidate, jobTitle, customMessage) => {
  const companyName = process.env.COMPANY_NAME || 'Our Company';
  const candidateName = candidate.name || 'Candidate';
  
  const templates = {
    interview_invite: {
      subject: `Interview Invitation - ${jobTitle}`,
      body: `Dear ${candidateName},

We are pleased to inform you that your application for the position of ${jobTitle} at ${companyName} has been shortlisted.

Based on your impressive profile and ATS score of ${candidate.ats_score || 0}%, we would like to invite you for an interview.

${customMessage ? `\n${customMessage}\n` : ''}

We will contact you shortly with the interview details.

Best regards,
${companyName} Recruitment Team`
    },
    offer: {
      subject: `Job Offer - ${jobTitle}`,
      body: `Dear ${candidateName},

Congratulations! We are delighted to offer you the position of ${jobTitle} at ${companyName}.

Your exceptional performance throughout the recruitment process, with an ATS score of ${candidate.ats_score || 0}%, has impressed our team.

${customMessage ? `\n${customMessage}\n` : ''}

Please find the detailed offer letter attached. We look forward to welcoming you to our team.

Best regards,
${companyName} HR Team`
    },
    rejection: {
      subject: `Application Update - ${jobTitle}`,
      body: `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position at ${companyName} and for taking the time to apply.

After careful consideration of all applications, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current needs.

${customMessage ? `\n${customMessage}\n` : ''}

We appreciate your interest in ${companyName} and wish you the best in your job search.

Best regards,
${companyName} Recruitment Team`
    },
    reminder: {
      subject: `Application Status Update - ${jobTitle}`,
      body: `Dear ${candidateName},

This is a friendly reminder regarding your application for the ${jobTitle} position at ${companyName}.

${customMessage ? `\n${customMessage}\n` : ''}

If you have any questions, please don't hesitate to reach out.

Best regards,
${companyName} Recruitment Team`
    }
  };
  
  return templates[emailType] || templates.interview_invite;
};

// Send email to top candidates
const sendEmailToTopCandidates = async (req, res) => {
  try {
    const { candidates, emailType, customMessage, jobTitle } = req.body;

    if (!candidates || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No candidates provided'
      });
    }

    console.log(`📧 Sending emails to ${candidates.length} candidates...`);

    // Get AI service URL
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001/api/ai';

    const results = [];
    const transporter = createTransporter();

    for (const candidate of candidates) {
      try {
        let emailContent;
        
        // Try to generate personalized email using AI
        try {
          const aiResponse = await axios.post(`${AI_SERVICE_URL}/email/generate`, {
            type: emailType || 'interview_invite',
            context: {
              candidate_name: candidate.name || 'Candidate',
              job_title: jobTitle || candidate.job_title || 'Position',
              company_name: process.env.COMPANY_NAME || 'Our Company',
              ats_score: candidate.ats_score || candidate.match_score || 0,
              matched_skills: candidate.matched_skills || [],
              custom_message: customMessage || ''
            },
            recipient_name: candidate.name || 'Candidate'
          });

          emailContent = aiResponse.data.data;
        } catch (aiError) {
          console.log('⚠️ AI service unavailable, using template email');
          // Fallback to template email if AI service is down
          emailContent = generateTemplateEmail(emailType, candidate, jobTitle, customMessage);
        }

        // Send actual email
        const mailOptions = {
          from: `${process.env.COMPANY_NAME || 'HRMS'} <${process.env.EMAIL_USER}>`,
          to: candidate.email,
          subject: emailContent.subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .score-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${process.env.COMPANY_NAME || 'HRMS'}</h1>
                  <p>Recruitment Team</p>
                </div>
                <div class="content">
                  ${emailContent.body.replace(/\n/g, '<br>')}
                  
                  ${candidate.ats_score || candidate.match_score ? `
                    <div style="margin: 20px 0; padding: 15px; background: white; border-left: 4px solid #667eea; border-radius: 5px;">
                      <p style="margin: 0;"><strong>Your ATS Score:</strong> <span class="score-badge">${candidate.ats_score || candidate.match_score}%</span></p>
                    </div>
                  ` : ''}
                  
                  ${customMessage ? `
                    <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                      <p style="margin: 0;"><strong>Additional Message:</strong></p>
                      <p>${customMessage}</p>
                    </div>
                  ` : ''}
                </div>
                <div class="footer">
                  <p>This is an automated email from ${process.env.COMPANY_NAME || 'HRMS'} Recruitment System</p>
                  <p>Please do not reply to this email. For inquiries, contact hr@company.com</p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        results.push({
          candidate_id: candidate.id,
          email: candidate.email,
          status: 'sent',
          message: 'Email sent successfully'
        });

        console.log(`✅ Email sent to ${candidate.email}`);

      } catch (error) {
        console.error(`❌ Failed to send email to ${candidate.email}:`, error.message);
        results.push({
          candidate_id: candidate.id,
          email: candidate.email,
          status: 'failed',
          message: error.message
        });
      }
    }

    // Summary
    const successCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    res.status(200).json({
      success: true,
      message: `Emails sent: ${successCount} successful, ${failedCount} failed`,
      data: {
        total: candidates.length,
        sent: successCount,
        failed: failedCount,
        results
      }
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emails',
      error: error.message
    });
  }
};

// Preview email without sending
const previewEmail = async (req, res) => {
  try {
    const { candidate, emailType, customMessage, jobTitle } = req.body;

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001/api/ai';

    // Generate email using AI
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/email/generate`, {
      type: emailType || 'interview_invite',
      context: {
        candidate_name: candidate.name || 'Candidate',
        job_title: jobTitle || candidate.job_title || 'Position',
        company_name: process.env.COMPANY_NAME || 'Our Company',
        ats_score: candidate.ats_score || candidate.match_score || 0,
        matched_skills: candidate.matched_skills || [],
        custom_message: customMessage || ''
      },
      recipient_name: candidate.name || 'Candidate'
    });

    res.status(200).json({
      success: true,
      data: aiResponse.data.data
    });

  } catch (error) {
    console.error('Error previewing email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview email',
      error: error.message
    });
  }
};

module.exports = {
  sendEmailToTopCandidates,
  previewEmail
};
