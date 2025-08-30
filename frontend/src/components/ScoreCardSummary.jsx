import React from 'react';

const ScoreCardSummary = ({ questions, responses, submission, onSubmit }) => {
  const calculateSectionStats = () => {
    const sections = {
      'Department Information': { questions: [], totalScore: 0, achievedScore: 0, range: '1-5' },
      'Research & Development': { questions: [], totalScore: 0, achievedScore: 0, range: '6-31' },
      'Faculty Contributions': { questions: [], totalScore: 0, achievedScore: 0, range: '32-49' },
      'Student Support': { questions: [], totalScore: 0, achievedScore: 0, range: '50-57' },
      'Continuous Improvement': { questions: [], totalScore: 0, achievedScore: 0, range: '58-61' }
    };

    questions.forEach(q => {
      const num = q.question_number;
      const response = responses[q.id];
      const score = response?.calculated_score || 0;
      
      let sectionName;
      if (num >= 1 && num <= 5) sectionName = 'Department Information';
      else if (num >= 6 && num <= 31) sectionName = 'Research & Development';
      else if (num >= 32 && num <= 49) sectionName = 'Faculty Contributions';
      else if (num >= 50 && num <= 57) sectionName = 'Student Support';
      else if (num >= 58 && num <= 61) sectionName = 'Continuous Improvement';

      if (sectionName) {
        sections[sectionName].questions.push(q);
        sections[sectionName].totalScore += q.max_score;
        sections[sectionName].achievedScore += score;
      }
    });

    return sections;
  };

  const getTotalStats = () => {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(responses).length;
    const totalPossibleScore = questions.reduce((sum, q) => sum + q.max_score, 0);
    const totalAchievedScore = Object.values(responses).reduce((sum, r) => sum + (r.calculated_score || 0), 0);
    const mandatoryQuestions = questions.filter(q => q.is_mandatory);
    const answeredMandatory = mandatoryQuestions.filter(q => responses[q.id]);

    return {
      totalQuestions,
      answeredQuestions,
      totalPossibleScore,
      totalAchievedScore,
      mandatoryQuestions: mandatoryQuestions.length,
      answeredMandatory: answeredMandatory.length,
      completionPercentage: (answeredQuestions / totalQuestions) * 100,
      scorePercentage: totalPossibleScore > 0 ? (totalAchievedScore / totalPossibleScore) * 100 : 0
    };
  };

  const getUnansweredQuestions = () => {
    return questions.filter(q => !responses[q.id]);
  };

  const sections = calculateSectionStats();
  const totalStats = getTotalStats();
  const unansweredQuestions = getUnansweredQuestions();

  return (
    <div className="scorecard-summary">
      <h2>📊 Score Card Summary</h2>

      {/* Overall Stats */}
      <div className="summary-overview">
        <div className="overview-cards">
          <div className="summary-card completion">
            <div className="card-content">
              <div className="card-number">{totalStats.answeredQuestions}/{totalStats.totalQuestions}</div>
              <div className="card-label">Questions Completed</div>
              <div className="card-percentage">{totalStats.completionPercentage.toFixed(1)}%</div>
            </div>
            <div className="card-progress">
              <div 
                className="progress-fill"
                style={{ width: `${totalStats.completionPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="summary-card score">
            <div className="card-content">
              <div className="card-number">{totalStats.totalAchievedScore}/{totalStats.totalPossibleScore}</div>
              <div className="card-label">Total Score</div>
              <div className="card-percentage">{totalStats.scorePercentage.toFixed(1)}%</div>
            </div>
            <div className="card-progress">
              <div 
                className="progress-fill score-fill"
                style={{ width: `${totalStats.scorePercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="summary-card mandatory">
            <div className="card-content">
              <div className="card-number">{totalStats.answeredMandatory}/{totalStats.mandatoryQuestions}</div>
              <div className="card-label">Mandatory Questions</div>
              <div className="card-percentage">
                {totalStats.mandatoryQuestions > 0 ? ((totalStats.answeredMandatory / totalStats.mandatoryQuestions) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="card-progress">
              <div 
                className="progress-fill mandatory-fill"
                style={{ 
                  width: totalStats.mandatoryQuestions > 0 
                    ? `${(totalStats.answeredMandatory / totalStats.mandatoryQuestions) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="section-breakdown">
        <h3>📋 Section-wise Performance</h3>
        <div className="sections-grid">
          {Object.entries(sections).map(([sectionName, section]) => (
            <div key={sectionName} className="section-summary-card">
              <div className="section-header">
                <h4>{sectionName}</h4>
                <span className="section-range">Q{section.range}</span>
              </div>
              
              <div className="section-stats">
                <div className="section-stat">
                  <span className="stat-label">Questions:</span>
                  <span className="stat-value">{section.questions.length}</span>
                </div>
                <div className="section-stat">
                  <span className="stat-label">Score:</span>
                  <span className="stat-value">{section.achievedScore}/{section.totalScore}</span>
                </div>
                <div className="section-stat">
                  <span className="stat-label">Percentage:</span>
                  <span className="stat-value">
                    {section.totalScore > 0 ? ((section.achievedScore / section.totalScore) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              <div className="section-progress">
                <div 
                  className="section-progress-fill"
                  style={{ 
                    width: section.totalScore > 0 
                      ? `${(section.achievedScore / section.totalScore) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>

              <div className="section-details">
                <div className="answered-questions">
                  Answered: {section.questions.filter(q => responses[q.id]).length}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unanswered Questions Alert */}
      {unansweredQuestions.length > 0 && (
        <div className="unanswered-section">
          <h3>⚠️ Unanswered Questions ({unansweredQuestions.length})</h3>
          <div className="unanswered-list">
            {unansweredQuestions.slice(0, 10).map(question => (
              <div key={question.id} className="unanswered-item">
                <span className="question-num">Q{question.question_number}</span>
                <span className="question-text">{question.question_text}</span>
                <span className="question-score">{question.max_score} pts</span>
                {question.is_mandatory && <span className="mandatory-flag">Required</span>}
              </div>
            ))}
            {unansweredQuestions.length > 10 && (
              <div className="more-questions">
                ... and {unansweredQuestions.length - 10} more questions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Status */}
      <div className="document-status">
        <h3>📎 Document Submission Status</h3>
        <div className="document-stats">
          <div className="doc-stat-item">
            <span className="doc-icon">🔗</span>
            <span className="doc-label">OneDrive Links:</span>
            <span className="doc-count">
              {Object.values(responses).filter(r => r.onedrive_link_1 || r.onedrive_link_2 || r.onedrive_link_3).length}
            </span>
          </div>
          
          <div className="doc-stat-item">
            <span className="doc-icon">📄</span>
            <span className="doc-label">Physical Documents:</span>
            <span className="doc-count">
              {Object.values(responses).filter(r => r.has_physical_documents).length}
            </span>
          </div>
          
          <div className="doc-stat-item">
            <span className="doc-icon">📁</span>
            <span className="doc-label">File Uploads:</span>
            <span className="doc-count">
              {Object.values(responses).filter(r => r.uploaded_files?.length > 0).length}
            </span>
          </div>
        </div>
      </div>

      {/* Submission Status */}
      {submission && (
        <div className="submission-info">
          <h3>📤 Submission Information</h3>
          <div className="submission-details">
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`status-badge status-${submission.submission_status}`}>
                {submission.submission_status === 'draft' && '📝 Draft'}
                {submission.submission_status === 'submitted' && '⏳ Submitted for Review'}
                {submission.submission_status === 'approved' && '✅ Approved'}
                {submission.submission_status === 'rejected' && '❌ Rejected'}
              </span>
            </div>
            
            {submission.submitted_at && (
              <div className="detail-item">
                <span className="detail-label">Submitted:</span>
                <span className="detail-value">
                  {new Date(submission.submitted_at).toLocaleString()}
                </span>
              </div>
            )}
            
            {submission.reviewed_date && (
              <div className="detail-item">
                <span className="detail-label">Reviewed:</span>
                <span className="detail-value">
                  {new Date(submission.reviewed_date).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="summary-actions">
        {submission && submission.submission_status === 'draft' && (
          <>
            {totalStats.answeredMandatory === totalStats.mandatoryQuestions && totalStats.answeredQuestions > 0 ? (
              <button 
                className="btn btn-success btn-lg"
                onClick={onSubmit}
              >
                📤 Submit Score Card for Review
              </button>
            ) : (
              <div className="submission-requirements">
                <p className="requirement-text">
                  ⚠️ Please complete all mandatory questions before submission
                </p>
                <button 
                  className="btn btn-success btn-lg"
                  onClick={onSubmit}
                  disabled
                >
                  📤 Submit Score Card for Review
                </button>
              </div>
            )}
          </>
        )}

        {submission && submission.submission_status === 'submitted' && (
          <div className="submission-pending">
            <p>⏳ Your score card has been submitted and is awaiting review by the administration.</p>
          </div>
        )}

        {submission && submission.submission_status === 'approved' && (
          <div className="submission-approved">
            <p>✅ Your score card has been approved. Thank you for your submission!</p>
          </div>
        )}

        {submission && submission.submission_status === 'rejected' && (
          <div className="submission-rejected">
            <p>❌ Your score card was rejected. Please review the comments and resubmit.</p>
            {submission.dean_comments && (
              <div className="rejection-comments">
                <strong>Comments:</strong> {submission.dean_comments}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helpful Tips */}
      <div className="summary-tips">
        <h3>💡 Tips for Better Scoring</h3>
        <ul>
          <li>Ensure all mandatory questions are answered completely</li>
          <li>Provide supporting documents through OneDrive links or physical submission</li>
          <li>Double-check your numerical responses for accuracy</li>
          <li>Include detailed descriptions where text responses are required</li>
          <li>Review each section to maximize your department's score</li>
        </ul>
      </div>
    </div>
  );
};

export default ScoreCardSummary;
