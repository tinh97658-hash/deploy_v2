import React, { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { FaEye, FaFileExcel } from 'react-icons/fa';
import StudentDetailModal from '../../components/admin/StudentDetailModal';
import MajorDetailModal from './MajorDetailModal';
import styles from './AdvancedReportsPage.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdvancedReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('excel');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isMajorDetailModalOpen, setIsMajorDetailModalOpen] = useState(false);
  const [majorDetailData, setMajorDetailData] = useState(null);
  const [data, setData] = useState({
    overview: null,
    organizational: null,
    topicAnalysis: null,
    excelStats: null
  });

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      const requests = [];
      
      if (activeTab === 'overview') {
        console.log('Loading overview data...');
        requests.push(
          fetch(`/api/admin/reports/dashboard-overview?timeRange=30`, { headers, credentials: 'include' })
        );
      } else if (activeTab === 'organizational') {
        console.log('Loading organizational data...');
        requests.push(
          fetch(`/api/admin/reports/organizational?level=department&timeRange=30`, { headers, credentials: 'include' }),
          fetch(`/api/admin/reports/organizational?level=major&timeRange=30`, { headers, credentials: 'include' }),
          fetch(`/api/admin/reports/organizational?level=class&timeRange=30`, { headers, credentials: 'include' })
        );
      } else if (activeTab === 'topics') {
        console.log('Loading topics data...');
        requests.push(
          fetch(`/api/admin/reports/topic-analysis?timeRange=30`, { headers, credentials: 'include' })
        );
      } else if (activeTab === 'excel') {
        console.log('Loading excel statistics data...');
        requests.push(
          fetch(`/api/admin/reports/excel-statistics?timeRange=30`, { headers, credentials: 'include' })
        );
      }

      console.log(`Making ${requests.length} API requests for tab: ${activeTab}`);

      const responses = await Promise.all(requests);
      
      // Check if all responses are OK
      for (let i = 0; i < responses.length; i++) {
        console.log(`Response ${i + 1}: Status ${responses[i].status}, URL: ${responses[i].url}`);
        if (!responses[i].ok) {
          const errorText = await responses[i].text();
          console.error(`API request ${i + 1} failed:`, responses[i].status, responses[i].url, errorText);
          throw new Error(`API request failed: ${responses[i].status} - ${errorText.substring(0, 100)}`);
        }
      }
      
      const results = await Promise.all(responses.map(r => r.json()));
      console.log('API results:', results);

      if (activeTab === 'overview') {
        setData(prev => ({ ...prev, overview: results[0].data }));
      } else if (activeTab === 'organizational') {
        setData(prev => ({ 
          ...prev, 
          organizational: {
            departments: results[0].data,
            majors: results[1].data,
            classes: results[2].data
          }
        }));
      } else if (activeTab === 'topics') {
        setData(prev => ({ ...prev, topicAnalysis: results[0].data }));
      } else if (activeTab === 'excel') {
        setData(prev => ({ ...prev, excelStats: results[0].data }));
      }

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const renderOverviewTab = () => {
    if (!data.overview) return null;

    const { keyMetrics, trendData } = data.overview;

    // Chart configurations
    const trendChartData = {
      labels: trendData.map(d => new Date(d.exam_date).toLocaleDateString('vi-VN')).reverse(),
      datasets: [
        {
          label: 'Số lượt thi',
          data: trendData.map(d => d.total_exams).reverse(),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Tỷ lệ đạt (%)',
          data: trendData.map(d => d.pass_rate || 0).reverse(),
          borderColor: '#15803d',
          backgroundColor: 'rgba(21, 128, 61, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#15803d',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    };

    const trendChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: {
              size: 12,
              family: 'Inter, sans-serif'
            }
          }
        },
        title: {
          display: true,
          text: 'Xu hướng tham gia và kết quả thi',
          font: {
            size: 16,
            weight: '600',
            family: 'Inter, sans-serif'
          },
          color: '#1f2937',
          padding: {
            top: 10,
            bottom: 30
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1f2937',
          bodyColor: '#374151',
          borderColor: '#d1d5db',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          usePointStyle: true
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            borderColor: '#e5e7eb'
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Số lượt thi',
            color: '#4f46e5',
            font: {
              size: 12,
              weight: '600',
              family: 'Inter, sans-serif'
            }
          },
          grid: {
            color: 'rgba(79, 70, 229, 0.1)',
            borderColor: '#e5e7eb'
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          max: 100,
          title: {
            display: true,
            text: 'Tỷ lệ đạt (%)',
            color: '#15803d',
            font: {
              size: 12,
              weight: '600',
              family: 'Inter, sans-serif'
            }
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        }
      }
    };

    return (
      <div className={styles.tabContent}>
        {/* Key Metrics Cards */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: 'var(--color-primary-soft)' }}>
              👥
            </div>
            <div className={styles.metricContent}>
              <h3>Tổng sinh viên</h3>
              <div className={styles.metricNumber}>{keyMetrics.totalStudents.toLocaleString()}</div>
              <div className={styles.metricDescription}>Sinh viên</div>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: 'var(--color-info-soft)' }}>
              📊
            </div>
            <div className={styles.metricContent}>
              <h3>Tỷ lệ tham gia</h3>
              <div className={styles.metricNumber}>{keyMetrics.participationRate}%</div>
              <div className={styles.metricDescription}>{keyMetrics.participatedStudents} đã tham gia</div>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: 'var(--color-success-soft)' }}>
              ✅
            </div>
            <div className={styles.metricContent}>
              <h3>Tỷ lệ đạt</h3>
              <div className={styles.metricNumber}>{keyMetrics.passRate}%</div>
              <div className={styles.metricDescription}>Sinh viên đạt yêu cầu</div>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: 'var(--color-warning-soft)' }}>
              🎯
            </div>
            <div className={styles.metricContent}>
              <h3>Điểm trung bình</h3>
              <div className={styles.metricNumber}>{keyMetrics.averageScore}</div>
              <div className={styles.metricDescription}>
                {keyMetrics.scoreRange.min} - {keyMetrics.scoreRange.max}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className={styles.chartSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartContainer}>
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrganizationalTab = () => {
    if (!data.organizational) return null;

    const { departments, majors } = data.organizational;

    return (
      <div className={styles.tabContent}>
        <div className={styles.organizationalSection}>
          <h3>📊 Báo cáo theo Khoa</h3>
          <div className={styles.tableContainer}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Khoa</th>
                  <th>Tổng SV</th>
                  <th>Đã tham gia</th>
                  <th>Tỷ lệ tham gia</th>
                  <th>Tỷ lệ đạt</th>
                </tr>
              </thead>
              <tbody>
                {departments.data?.map((dept, index) => (
                  <tr key={index}>
                    <td>
                      <div className={styles.departmentInfo}>
                        <div className={styles.departmentIcon}>🏛️</div>
                        <span>{dept.dept_name}</span>
                      </div>
                    </td>
                    <td>{dept.total_students}</td>
                    <td>{dept.participated_students}</td>
                    <td>
                      <span className={`${styles.badge} ${dept.participation_rate >= 80 ? styles.success : dept.participation_rate >= 60 ? styles.warning : styles.danger}`}>
                        {dept.participation_rate}%
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${dept.pass_rate >= 80 ? styles.success : dept.pass_rate >= 60 ? styles.warning : styles.danger}`}>
                        {dept.pass_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.organizationalSection}>
          <h3>🎓 Top 10 Ngành có kết quả tốt nhất</h3>
          <div className={styles.tableContainer}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Ngành</th>
                  <th>Khoa</th>
                  <th>Tỷ lệ đạt</th>
                  <th>Tỷ lệ tham gia</th>
                </tr>
              </thead>
              <tbody>
                {majors.data?.slice(0, 10).map((major, index) => (
                  <tr key={index}>
                    <td>
                      <span className={styles.rank}>#{index + 1}</span>
                    </td>
                    <td>
                      <div className={styles.majorInfo}>
                        <div className={styles.majorIcon}>💻</div>
                        <span>{major.major_name}</span>
                      </div>
                    </td>
                    <td>{major.dept_name}</td>
                    <td>
                      <span className={`${styles.badge} ${major.pass_rate >= 80 ? styles.success : major.pass_rate >= 60 ? styles.warning : styles.danger}`}>
                        {major.pass_rate}%
                      </span>
                    </td>
                    <td>{major.participation_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTopicsTab = () => {
    if (!data.topicAnalysis) return null;

    const { topicStats, questionAnalysis, summary } = data.topicAnalysis;

    // Topic difficulty distribution chart
    const difficultyData = {
      labels: ['Dễ', 'Trung bình', 'Khó', 'Rất khó', 'Chưa có dữ liệu'],
      datasets: [{
        data: [
          topicStats.filter(t => t.difficulty === 'Dễ').length,
          topicStats.filter(t => t.difficulty === 'Trung bình').length,
          topicStats.filter(t => t.difficulty === 'Khó').length,
          topicStats.filter(t => t.difficulty === 'Rất khó').length,
          topicStats.filter(t => t.difficulty === 'Chưa có dữ liệu').length,
        ],
        backgroundColor: [
          '#15803d',  // Xanh lá - Dễ
          '#0891b2',  // Xanh dương - Trung bình  
          '#d97706',  // Cam - Khó
          '#dc2626',  // Đỏ - Rất khó
          '#6b7280'   // Xám - Chưa có dữ liệu
        ],
        borderColor: [
          '#15803d',
          '#0891b2', 
          '#d97706',
          '#dc2626',
          '#6b7280'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(21, 128, 61, 0.8)',
          'rgba(8, 145, 178, 0.8)',
          'rgba(217, 119, 6, 0.8)',
          'rgba(220, 38, 38, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        hoverBorderColor: [
          '#15803d',
          '#0891b2',
          '#d97706', 
          '#dc2626',
          '#6b7280'
        ],
        hoverBorderWidth: 3
      }]
    };

    const difficultyChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            boxWidth: 15,
            boxHeight: 15,
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            },
            generateLabels: (chart) => {
              const datasets = chart.data.datasets;
              if (datasets.length) {
                return chart.data.labels.map((label, index) => ({
                  text: `${label} (${datasets[0].data[index]})`,
                  fillStyle: datasets[0].backgroundColor[index],
                  strokeStyle: datasets[0].borderColor[index],
                  lineWidth: datasets[0].borderWidth,
                  hidden: false,
                  index: index
                }));
              }
              return [];
            }
          }
        },
        title: {
          display: true,
          text: 'Phân bổ độ khó chuyên đề',
          font: {
            size: 15,
            weight: '600',
            family: 'Inter, sans-serif'
          },
          color: '#1f2937',
          padding: {
            top: 5,
            bottom: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1f2937',
          bodyColor: '#374151',
          borderColor: '#d1d5db',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} chuyên đề (${percentage}%)`;
            }
          }
        }
      },
      cutout: '35%',
      elements: {
        arc: {
          borderWidth: 2,
          borderAlign: 'inner'
        }
      },
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }
      }
    };

    return (
      <div className={styles.tabContent}>
        {/* Summary Cards */}
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <h4>Tổng chuyên đề</h4>
            <div className={styles.summaryNumber}>{summary.totalTopics}</div>
          </div>
          <div className={styles.summaryCard}>
            <h4>Tỷ lệ đạt TB</h4>
            <div className={styles.summaryNumber}>{summary.avgPassRate}%</div>
          </div>
          <div className={styles.summaryCard}>
            <h4>Khó nhất</h4>
            <div className={styles.summaryText}>{summary.mostDifficultTopic?.topic_name || 'Chưa có dữ liệu'}</div>
          </div>
          <div className={styles.summaryCard}>
            <h4>Dễ nhất</h4>
            <div className={styles.summaryText}>{summary.easiestTopic?.topic_name || 'Chưa có dữ liệu'}</div>
          </div>
        </div>

        <div className={styles.topicsSection}>
          <div className={styles.topicsGrid}>
            {/* Topic Performance Table */}
            <div className={styles.topicsTable}>
              <h3>📚 Phân tích Chuyên đề</h3>
              <div className={styles.tableContainer}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Chuyên đề</th>
                      <th>Tham gia</th>
                      <th>Tỷ lệ đạt</th>
                      <th>Độ khó</th>
                      <th>Thời gian TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicStats.map((topic, index) => (
                      <tr key={index}>
                        <td>
                          <div className={styles.topicInfo}>
                            <span className={styles.topicName}>{topic.topic_name}</span>
                            <small>{topic.question_count} câu hỏi</small>
                          </div>
                        </td>
                        <td>{topic.total_participants}</td>
                        <td>
                          <span className={`${styles.badge} ${topic.pass_rate >= 80 ? styles.success : topic.pass_rate >= 60 ? styles.warning : styles.danger}`}>
                            {topic.pass_rate}%
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.difficulty} ${styles[topic.difficulty.toLowerCase().replace(' ', '')]}`}>
                            {topic.difficulty}
                          </span>
                        </td>
                        <td>
                          {topic.avg_duration_minutes ? (
                            <div className={styles.durationInfo}>
                              <span className={styles.actualDuration}>{topic.avg_duration_minutes} phút</span>
                              {topic.allocated_duration && (
                                <small className={styles.allocatedDuration}>
                                  (Quy định: {topic.allocated_duration} phút)
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className={styles.noData}>Chưa có dữ liệu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Difficulty Distribution Chart */}
            <div className={styles.chartCard}>
              <h3>📊 Phân bổ độ khó</h3>
              <div className={styles.doughnutContainer}>
                <Doughnut data={difficultyData} options={difficultyChartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Most Difficult Questions */}
        <div className={styles.questionSection}>
          <h3>🎯 Top 10 câu hỏi khó nhất</h3>
          <div className={styles.tableContainer}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Nội dung câu hỏi</th>
                  <th>Chuyên đề</th>
                  <th>Tỷ lệ đúng</th>
                  <th>Lượt trả lời</th>
                </tr>
              </thead>
              <tbody>
                {questionAnalysis.map((question, index) => (
                  <tr key={index}>
                    <td>
                      <span className={styles.rank}>#{index + 1}</span>
                    </td>
                    <td>
                      <div className={styles.questionContent}>
                        {question.question_content.substring(0, 100)}...
                      </div>
                    </td>
                    <td>{question.topic_name}</td>
                    <td>
                      <span className={`${styles.badge} ${question.correct_rate >= 60 ? styles.success : question.correct_rate >= 40 ? styles.warning : styles.danger}`}>
                        {question.correct_rate}%
                      </span>
                    </td>
                    <td>{question.total_answers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Handle view major detail
  const handleViewMajorDetail = async (majorId, majorName) => {
    console.log('handleViewMajorDetail called with:', { majorId, majorName });
    try {
      setIsMajorDetailModalOpen(true);
      
  console.log('Making API call to:', `/api/admin/reports/major-detail?majorId=${majorId}&timeRange=30`);
  const response = await fetch(`/api/admin/reports/major-detail?majorId=${majorId}&timeRange=30`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch major details');
      }
      
      const result = await response.json();
      console.log('API response data:', result);
      setMajorDetailData(result.data);
      
    } catch (error) {
      console.error('Error fetching major details:', error);
      alert('Lỗi khi tải chi tiết ngành: ' + error.message);
    }
  };

  // Handle export Excel by major
  const handleExportMajorExcel = async (majorId, majorName) => {
    console.log('Exporting Excel for major:', { majorId, majorName });
    
    // Validate majorId
    if (!majorId || majorId === 'undefined' || majorId === 'null' || isNaN(parseInt(majorId))) {
      alert('Lỗi: ID ngành không hợp lệ. Vui lòng thử lại.');
      return;
    }
    
    try {
      const cleanMajorName = majorName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `DanhSach_${cleanMajorName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      console.log('Making request to export API...');
  const response = await fetch(`/api/admin/reports/export-students?majorId=${majorId}&format=excel&groupBy=class`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage = 'Có lỗi xảy ra khi xuất Excel';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // Use default message if can't parse JSON
        }
        
        throw new Error(errorMessage);
      }
      
      // Create download link
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('File xuất ra không có dữ liệu');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('File downloaded successfully:', fileName);
      alert(`Đã xuất Excel thành công: ${fileName}`);
      
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Lỗi khi xuất Excel: ' + error.message);
    }
  };

  const renderExcelTab = () => {
    if (!data.excelStats) return null;

    const { majorStats } = data.excelStats;

    return (
      <div className={styles.tabContent}>
        {/* Major Statistics */}
        <div className={styles.excelSection}>
          <h3>🎓 Thống kê theo Ngành</h3>
          <div className={styles.tableContainer}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>Ngành</th>
                  <th>Khoa</th>
                  <th>Tổng SV</th>
                  <th>Đạt</th>
                  <th>Không đạt</th>
                  <th>Chưa thi</th>
                  <th>Tỷ lệ đạt</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {majorStats.map((major, index) => (
                  <tr key={index}>
                    <td>
                      <div className={styles.majorInfo}>
                        <div className={styles.majorIcon}>🎓</div>
                        <span>{major.major_name}</span>
                      </div>
                    </td>
                    <td>{major.dept_name}</td>
                    <td>{major.total_students}</td>
                    <td className={styles.passedCount}>{major.passed_students}</td>
                    <td className={styles.failedCount}>{major.failed_students}</td>
                    <td className={styles.notParticipatedCount}>{major.not_participated}</td>
                    <td>
                      <span className={`${styles.badge} ${major.pass_rate >= 80 ? styles.success : major.pass_rate >= 60 ? styles.warning : styles.danger}`}>
                        {major.pass_rate || 0}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.actionContainer}>
                        <button 
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          onClick={() => handleViewMajorDetail(major.major_id, major.major_name)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.excelBtn}`}
                          onClick={() => handleExportMajorExcel(major.major_id, major.major_name)}
                          title="Xuất Excel theo lớp"
                        >
                          <FaFileExcel />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false);
    setSelectedStudentId(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>📊 Báo cáo Toàn diện</h1>
          <p className={styles.subtitle}>Phân tích chi tiết và insights về hệ thống thi</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Tổng quan
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'organizational' ? styles.active : ''}`}
            onClick={() => setActiveTab('organizational')}
          >
            🏛️ Theo tổ chức
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'topics' ? styles.active : ''}`}
            onClick={() => setActiveTab('topics')}
          >
            📚 Chuyên đề
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'excel' ? styles.active : ''}`}
            onClick={() => setActiveTab('excel')}
          >
            � Thống kê Excel
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContentContainer}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'organizational' && renderOrganizationalTab()}
        {activeTab === 'topics' && renderTopicsTab()}
        {activeTab === 'excel' && renderExcelTab()}
      </div>

      {/* Student Detail Modal */}
      <StudentDetailModal 
        studentId={selectedStudentId}
        isOpen={isStudentModalOpen}
        onClose={handleCloseStudentModal}
      />

      {/* Major Detail Modal */}
      <MajorDetailModal 
        majorDetailData={majorDetailData}
        isOpen={isMajorDetailModalOpen}
        onClose={() => setIsMajorDetailModalOpen(false)}
      />
    </div>
  );
};

export default AdvancedReportsPage;
