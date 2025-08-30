import React, { useState, useEffect } from 'react';
import API from '../Api';

// Statistics View Component
const StatisticsView = ({ template, questions }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      fetchStatistics();
    }
  }, [template]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/api/scorecard/templates/${template.id}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSectionStats = () => {
    const sections = {
      'Department Information': { questions: [], totalScore: 0, range: '1-5' },
      'Research & Development': { questions: [], totalScore: 0, range: '6-31' },
      'Faculty Contributions': { questions: [], totalScore: 0, range: '32-49' },
      'Student Support': { questions: [], totalScore: 0, range: '50-57' },
      'Continuous Improvement': { questions: [], totalScore: 0, range: '58-61' }
    };

    questions.forEach(q => {
      const num = q.question_number;
      if (num >= 1 && num <= 5) {
        sections['Department Information'].questions.push(q);
        sections['Department Information'].totalScore += q.max_score;
      } else if (num >= 6 && num <= 31) {
        sections['Research & Development'].questions.push(q);
        sections['Research & Development'].totalScore += q.max_score;
      } else if (num >= 32 && num <= 49) {
        sections['Faculty Contributions'].questions.push(q);
        sections['Faculty Contributions'].totalScore += q.max_score;
      } else if (num >= 50 && num <= 57) {
        sections['Student Support'].questions.push(q);
        sections['Student Support'].totalScore += q.max_score;
      } else if (num >= 58 && num <= 61) {
        sections['Continuous Improvement'].questions.push(q);
        sections['Continuous Improvement'].totalScore += q.max_score;
      }
    });

    return sections;
  };

  const getQuestionTypeStats = () => {
    const types = {};
    questions.forEach(q => {
      types[q.question_type] = (types[q.question_type] || 0) + 1;
    });
    return types;
  };

  const getDocumentStats = () => {
    const withDocs = questions.filter(q => q.requires_document).length;
    const withoutDocs = questions.length - withDocs;
    return { withDocs, withoutDocs };
  };

  const getMandatoryStats = () => {
    const mandatory = questions.filter(q => q.is_mandatory).length;
    const optional = questions.length - mandatory;
    return { mandatory, optional };
  };

  const sections = calculateSectionStats();
  const questionTypes = getQuestionTypeStats();
  const documentStats = getDocumentStats();
  const mandatoryStats = getMandatoryStats();

  if (loading) {
    return (
      <div className="statistics-loading">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      <div className="stats-header">
        <h2>📈 Template Statistics: {template.name}</h2>
        <p>Comprehensive analysis of questions and scoring distribution</p>
      </div>

      {/* Overview Cards */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{questions.length}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">
            {questions.reduce((sum, q) => sum + q.max_score, 0)}
          </div>
          <div className="stat-label">Total Score</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{documentStats.withDocs}</div>
          <div className="stat-label">Require Documents</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{mandatoryStats.mandatory}</div>
          <div className="stat-label">Mandatory Questions</div>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="stats-section">
        <h3>📊 Section-wise Analysis</h3>
        <div className="sections-grid">
          {Object.entries(sections).map(([sectionName, section]) => (
            <div key={sectionName} className="section-card">
              <h4>{sectionName}</h4>
              <div className="section-stats">
                <div className="section-stat">
                  <span className="stat-value">{section.questions.length}</span>
                  <span className="stat-label">Questions</span>
                </div>
                <div className="section-stat">
                  <span className="stat-value">{section.totalScore}</span>
                  <span className="stat-label">Points</span>
                </div>
                <div className="section-stat">
                  <span className="stat-value">{section.range}</span>
                  <span className="stat-label">Range</span>
                </div>
              </div>
              
              <div className="section-progress">
                <div 
                  className="progress-bar"
                  style={{
                    width: `${(section.totalScore / questions.reduce((sum, q) => sum + q.max_score, 0)) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Types Distribution */}
      <div className="stats-section">
        <h3>📋 Question Types Distribution</h3>
        <div className="types-grid">
          {Object.entries(questionTypes).map(([type, count]) => (
            <div key={type} className="type-card">
              <div className="type-icon">
                {type === 'objective' && '🎯'}
                {type === 'text' && '📝'}
                {type === 'upload' && '📎'}
              </div>
              <div className="type-info">
                <div className="type-count">{count}</div>
                <div className="type-name">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div className="type-percentage">
                  {((count / questions.length) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Requirements */}
      <div className="stats-section">
        <h3>📄 Document Requirements</h3>
        <div className="document-stats">
          <div className="doc-stat-card">
            <div className="doc-icon">📎</div>
            <div className="doc-info">
              <div className="doc-count">{documentStats.withDocs}</div>
              <div className="doc-label">Require Documents</div>
              <div className="doc-percentage">
                {((documentStats.withDocs / questions.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="doc-stat-card">
            <div className="doc-icon">📝</div>
            <div className="doc-info">
              <div className="doc-count">{documentStats.withoutDocs}</div>
              <div className="doc-label">Text/Number Only</div>
              <div className="doc-percentage">
                {((documentStats.withoutDocs / questions.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="stats-section">
        <h3>🎯 Score Distribution</h3>
        <div className="score-distribution">
          {questions
            .sort((a, b) => b.max_score - a.max_score)
            .slice(0, 10)
            .map(question => (
              <div key={question.id} className="score-item">
                <div className="score-question">
                  <span className="question-num">Q{question.question_number}</span>
                  <span className="question-text">{question.question_text.substring(0, 50)}...</span>
                </div>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{
                      width: `${(question.max_score / Math.max(...questions.map(q => q.max_score))) * 100}%`
                    }}
                  ></div>
                  <span className="score-value">{question.max_score} pts</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Template Health Check */}
      <div className="stats-section">
        <h3>✅ Template Health Check</h3>
        <div className="health-checks">
          <div className={`health-item ${questions.length >= 10 ? 'healthy' : 'warning'}`}>
            <span className="health-icon">
              {questions.length >= 10 ? '✅' : '⚠️'}
            </span>
            <span className="health-text">
              Question Count: {questions.length} {questions.length >= 10 ? '(Good)' : '(Consider adding more)'}
            </span>
          </div>
          
          <div className={`health-item ${questions.reduce((sum, q) => sum + q.max_score, 0) >= 100 ? 'healthy' : 'warning'}`}>
            <span className="health-icon">
              {questions.reduce((sum, q) => sum + q.max_score, 0) >= 100 ? '✅' : '⚠️'}
            </span>
            <span className="health-text">
              Total Score: {questions.reduce((sum, q) => sum + q.max_score, 0)} 
              {questions.reduce((sum, q) => sum + q.max_score, 0) >= 100 ? ' (Good)' : ' (Consider increasing)'}
            </span>
          </div>
          
          <div className={`health-item ${documentStats.withDocs > 0 ? 'healthy' : 'warning'}`}>
            <span className="health-icon">
              {documentStats.withDocs > 0 ? '✅' : '⚠️'}
            </span>
            <span className="health-text">
              Document Evidence: {documentStats.withDocs} questions 
              {documentStats.withDocs > 0 ? ' (Good)' : ' (Consider requiring documents)'}
            </span>
          </div>
        </div>
      </div>

      {/* Export Stats */}
      <div className="stats-actions">
        <button 
          className="btn btn-outline"
          onClick={() => {
            const statsData = {
              template_name: template.name,
              overview: {
                total_questions: questions.length,
                total_score: questions.reduce((sum, q) => sum + q.max_score, 0),
                questions_with_documents: documentStats.withDocs,
                mandatory_questions: mandatoryStats.mandatory
              },
              sections,
              question_types: questionTypes,
              document_stats: documentStats,
              mandatory_stats: mandatoryStats,
              generated_at: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(statsData, null, 2)], {
              type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scorecard-stats-${template.id}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          📊 Export Statistics
        </button>
      </div>
    </div>
  );
};

export default StatisticsView;
