import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [learners, setLearners] = useState([])
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ total: 0, activities: {}, cohorts: {} })

  useEffect(()=>{
    // Fetch data from API route for deployment
    const tryFetch = async ()=>{
      try{
        const r = await fetch('/api/learners');
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        const learners = j.learners || [];
        console.log('Fetched learners:', learners.length, learners);
        setLearners(learners);
          
          // Calculate stats
          const activities = {};
          const cohorts = {};
          const cohortActivities = {}; // New: activities breakdown per cohort
          let studyingCount = 0;
          let bursaryCount = 0;
          
          learners.forEach(l => {
            const activity = l.current_activity_type || 'Unknown';
            const cohort = l.cohort || l.cohort_year || 'Unknown';
            
            // Simple bursary check - only check the main field since duplicates are a processing error
            const hasBursary = l.has_bursary === 'True';
            
            // Overall activity count
            activities[activity] = (activities[activity] || 0) + 1;
            
            // Overall cohort count
            cohorts[cohort] = (cohorts[cohort] || 0) + 1;
            
            // Activity breakdown per cohort
            if (!cohortActivities[cohort]) {
              cohortActivities[cohort] = {};
            }
            cohortActivities[cohort][activity] = (cohortActivities[cohort][activity] || 0) + 1;
            
            // Count studying students and those with bursaries
            if (activity.toLowerCase().includes('studying')) {
              studyingCount++;
            }
            if (hasBursary) {
              bursaryCount++;
            }
          });
          
          // Calculate alumni projections data
          const actualAlumniData = [
            { year: 2022, value: 53 },
            { year: 2023, value: 104 }, // 53 + 51
            { year: 2024, value: 163 }, // 104 + 59  
            { year: 2025, value: 226 }  // 163 + 63 (current total)
          ];
          
          const projectedAlumniData = [
            { year: 2026, value: 346 }, // 226 + 120
            { year: 2027, value: 526 }, // 346 + 180
            { year: 2028, value: 706 }, // 526 + 180
            { year: 2029, value: 886 }, // 706 + 180
            { year: 2030, value: 1066 } // 886 + 180
          ];
          
          // Calculate studying qualifications breakdown
          const studyingQualifications = {};
          learners.forEach(l => {
            const activity = l.current_activity_type || 'Unknown';
            const qualification = l.qualification_type || '';
            
            if (activity.toLowerCase().includes('studying')) {
              // Group qualifications into 3 categories
              let groupedQual;
              if (qualification.toLowerCase().includes('degree')) {
                groupedQual = 'Degree';
              } else if (qualification.toLowerCase().includes('diploma') || 
                        qualification.toLowerCase().includes('certificate')) {
                groupedQual = 'Diploma/Certificate';
              } else {
                groupedQual = 'Other';
              }
              
              studyingQualifications[groupedQual] = (studyingQualifications[groupedQual] || 0) + 1;
            }
          });
          
          const newStats = { 
            activities, 
            cohorts,
            cohortActivities,
            studyingQualifications,
            total: learners.length,
            studyingCount,
            bursaryCount,
            actualAlumniData,
            projectedAlumniData
          };
          console.log('Calculated stats:', newStats);
          setStats(newStats);
          return;
        }catch(e){
          console.log('API failed:', e);
          setError('Failed to fetch learners from API');
        }
      }
      setError('Failed to fetch learners from backend');
    }
    tryFetch();
  }, [])

  const pastelColors = ['#FFB6C1', '#DDA0DD', '#98FB98', '#F0E68C', '#87CEEB', '#FFA07A'];
  
  // Activity-specific color mapping
  const getActivityColor = (activityType) => {
    const activity = (activityType || '').toLowerCase();
    if (activity.includes('employed') && !activity.includes('unemployed')) return '#98FB98'; // Green - employed but not unemployed
    if (activity.includes('studying')) return '#87CEEB'; // Blue
    if (activity.includes('internship')) return '#F0E68C'; // Pastel Yellow
    if (activity.includes('tbc') || activity.includes('to be confirmed')) return '#DDA0DD'; // Purple
    if (activity.includes('unemployed') || activity === 'unemployed') return '#FF69B4'; // Hot Pink/Red
    // Default colors for other activities
    const defaultColors = ['#F0E68C', '#FFB6C1', '#FFA07A', '#E6E6FA', '#F0F8FF', '#FFEFD5'];
    return defaultColors[Math.abs(activity.charCodeAt(0) || 0) % defaultColors.length];
  };
  
  // Donut Chart Component - like pie chart but with hollow center
  const DonutChart = ({ data, title, centerText }) => {
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return <div>No data available</div>;
    
    let currentAngle = 0;
    const outerRadius = 80;
    const innerRadius = 40; // Creates the donut hole
    const center = 100;
    
    // Colors for qualifications - matching the activity chart colors
    const getQualificationColor = (qualification) => {
      const qual = (qualification || '').toLowerCase();
      if (qual.includes('degree')) return '#87CEEB'; // Blue (like studying)
      if (qual.includes('diploma') || qual.includes('certificate')) return '#98FB98'; // Green (like employed)
      if (qual.includes('other')) return '#F0E68C'; // Pastel Yellow (like internship)
      return '#DDA0DD'; // Purple (like TBC)
    };
    
    const handleMouseEnter = (e, label, value, percentage) => {
      setTooltip({
        show: true,
        x: e.clientX,
        y: e.clientY,
        content: `${label}: ${value} students (${Math.round(percentage * 100)}%)`
      });
    };
    
    const handleMouseLeave = () => {
      setTooltip({ show: false, x: 0, y: 0, content: '' });
    };
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <svg width="240" height="240">
          {/* Donut segments */}
          {Object.entries(data).map(([label, value], idx) => {
            const percentage = value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            // Calculate outer arc path
            const x1 = 120 + outerRadius * Math.cos(startAngle * Math.PI / 180);
            const y1 = 120 + outerRadius * Math.sin(startAngle * Math.PI / 180);
            const x2 = 120 + outerRadius * Math.cos(endAngle * Math.PI / 180);
            const y2 = 120 + outerRadius * Math.sin(endAngle * Math.PI / 180);
            
            // Calculate inner arc path
            const x3 = 120 + innerRadius * Math.cos(endAngle * Math.PI / 180);
            const y3 = 120 + innerRadius * Math.sin(endAngle * Math.PI / 180);
            const x4 = 120 + innerRadius * Math.cos(startAngle * Math.PI / 180);
            const y4 = 120 + innerRadius * Math.sin(startAngle * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            // Donut path (outer arc + inner arc)
            const pathData = [
              'M', x1, y1,
              'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
              'L', x3, y3,
              'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
              'Z'
            ].join(' ');
            
            // Calculate label position (outside the donut)
            const midAngle = (startAngle + endAngle) / 2;
            const labelRadius = outerRadius + 25; // Position labels outside the donut
            const labelX = 120 + labelRadius * Math.cos(midAngle * Math.PI / 180);
            const labelY = 120 + labelRadius * Math.sin(midAngle * Math.PI / 180);
            
            // Calculate line position (from donut edge to label)
            const lineStartX = 120 + (outerRadius + 5) * Math.cos(midAngle * Math.PI / 180);
            const lineStartY = 120 + (outerRadius + 5) * Math.sin(midAngle * Math.PI / 180);
            const lineEndX = 120 + (outerRadius + 20) * Math.cos(midAngle * Math.PI / 180);
            const lineEndY = 120 + (outerRadius + 20) * Math.sin(midAngle * Math.PI / 180);
            
            currentAngle = endAngle;
            
            return (
              <g key={label}>
                <path
                  d={pathData}
                  fill={getQualificationColor(label)}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleMouseEnter(e, label, value, percentage)}
                  onMouseLeave={handleMouseLeave}
                />
                
                {/* Leader line from segment to label */}
                <line
                  x1={lineStartX}
                  y1={lineStartY}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke="#6b7280"
                  strokeWidth="1"
                />
                
                {/* Segment label outside the donut */}
                <text
                  x={labelX}
                  y={labelY - 5}
                  textAnchor={labelX > 120 ? 'start' : 'end'}
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#1f2937"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
                
                {/* Percentage below label */}
                <text
                  x={labelX}
                  y={labelY + 8}
                  textAnchor={labelX > 120 ? 'start' : 'end'}
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="#6b7280"
                  style={{ pointerEvents: 'none' }}
                >
                  {Math.round(percentage * 100)}% ({value})
                </text>
              </g>
            );
          })}
          
          {/* Center text */}
          <text
            x={120}
            y={120 - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fontWeight="700"
            fill="#1f2937"
          >
            {centerText || total}
          </text>
          <text
            x={120}
            y={120 + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#6b7280"
          >
            Studying
          </text>
        </svg>
        
        {/* Tooltip */}
        {tooltip.show && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}>
            {tooltip.content}
          </div>
        )}
      </div>
    );
  };

  // Function to sort activities in consistent order
  const getSortedActivities = (data) => {
    // Define the preferred order: good statuses first, then problematic ones
    const activityOrder = [
      'Employed',      // Good status
      'Studying',      // Good status  
      'Internship',    // Good status
      'Unemployed',    // Problematic status
      'TBC',           // Problematic status
      'To be confirmed' // Problematic status variant
    ];
    
    const entries = Object.entries(data);
    const sorted = [];
    
    // First, add activities in the preferred order if they exist
    activityOrder.forEach(preferredActivity => {
      const entry = entries.find(([activity]) => 
        activity.toLowerCase().includes(preferredActivity.toLowerCase()) ||
        preferredActivity.toLowerCase().includes(activity.toLowerCase())
      );
      if (entry) {
        sorted.push(entry);
      }
    });
    
    // Then add any remaining activities that weren't in the preferred order
    entries.forEach(entry => {
      if (!sorted.some(sortedEntry => sortedEntry[0] === entry[0])) {
        sorted.push(entry);
      }
    });
    
    return sorted;
  };

  // Waffle Chart Component - shows data as a grid of squares
  const WaffleChart = ({ data, title }) => {
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
    
    // Use fixed values for waffle chart with exact activity names
    const fixedData = {
      'Employed': 43,
      'Studying': 108, 
      'Internship': 12,
      'TBC': 37,
      'Unemployed': 20
    };
    
    const total = Object.values(fixedData).reduce((a, b) => a + b, 0);
    if (total === 0) return <div>No data available</div>;
    
    // Calculate grid size - 22x10 rectangle = 220 squares
    const gridSize = 220; // 22x10 = 220 squares
    const squareSize = 14; // Slightly larger squares for the more square format
    const squaresPerRow = 22; // 22 columns, 10 rows
    const rows = 10;
    
    // Define exact order for waffle chart (don't use the sorting function)
    const activityOrder = ['Employed', 'Studying', 'Internship', 'Unemployed', 'TBC'];
    
    // Get entries in the desired order
    const orderedEntries = activityOrder
      .filter(activity => fixedData[activity] > 0)
      .map(activity => [activity, fixedData[activity]]);
    
    // Debug: Log the exact data being used
    console.log('Waffle Chart Fixed Data:', fixedData);
    console.log('Total:', total);
    console.log('Ordered Entries:', orderedEntries);
    
    // Create array of squares with their activity type - PROPERLY grouped by category
    const squares = [];
    const activitySquareCount = {};
    
    // Calculate exact number of squares for each activity based on percentage
    orderedEntries.forEach(([activity, count]) => {
      const exactPercentage = (count / total) * 100;
      const numSquares = Math.round((count / total) * gridSize);
      activitySquareCount[activity] = numSquares;
      
      console.log(`${activity}: ${count}/${total} = ${exactPercentage.toFixed(1)}% → ${numSquares} squares`);
    });
    
    // Add squares for each activity in blocks (this ensures proper grouping)
    orderedEntries.forEach(([activity, count]) => {
      const numSquares = activitySquareCount[activity];
      const color = getActivityColor(activity);
      
      console.log(`Adding ${numSquares} squares for ${activity} with color ${color}`);
      
      // Add all squares for this activity in a continuous block
      for (let i = 0; i < numSquares; i++) {
        squares.push({
          index: squares.length,
          activity,
          count,
          percentage: (count / total) * 100,
          color: color
        });
      }
    });
    
    // If we have fewer squares than the grid, pad with empty squares
    while (squares.length < gridSize) {
      squares.push({
        index: squares.length,
        activity: 'Empty',
        count: 0,
        percentage: 0,
        color: '#f3f4f6' // Light gray for empty squares
      });
    }
    
    // If we have too many squares, trim to exact grid size
    if (squares.length > gridSize) {
      squares.splice(gridSize);
    }
    
    console.log(`Final squares: ${squares.length}, Non-empty: ${squares.filter(s => s.activity !== 'Empty').length}`);
    
    const handleMouseEnter = (e, square) => {
      if (square.activity === 'Empty') return;
      
      setTooltip({
        show: true,
        x: e.clientX,
        y: e.clientY,
        content: `${square.activity}: ${square.count} total (${Math.round(square.percentage)}%)`
      });
    };
    
    const handleMouseLeave = () => {
      setTooltip({ show: false, x: 0, y: 0, content: '' });
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${squaresPerRow}, ${squareSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${squareSize}px)`,
          gap: '1px',
          padding: '10px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#f9fafb'
        }}>
          {squares.map((square, index) => (
            <div
              key={index}
              style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                backgroundColor: square.color,
                border: square.activity === 'Empty' ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '1px',
                cursor: square.activity === 'Empty' ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: square.activity === 'Empty' ? 0.3 : 1
              }}
              onMouseEnter={(e) => handleMouseEnter(e, square)}
              onMouseLeave={handleMouseLeave}
              onMouseOver={(e) => {
                if (square.activity !== 'Empty') {
                  e.target.style.transform = 'scale(1.3)';
                  e.target.style.zIndex = '10';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (square.activity !== 'Empty') {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.zIndex = '1';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
          ))}
        </div>
        
        {/* Tooltip */}
        {tooltip.show && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}>
            {tooltip.content}
          </div>
        )}
      </div>
    );
  };

  // Simple Pie Chart Component with labels on segments and tooltips
  const PieChart = ({ data, title, showNumbers = false }) => {
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return <div>No data available</div>;
    
    // Get sorted activities for consistent ordering
    const sortedEntries = getSortedActivities(data);
    
    let currentAngle = 0;
    const radius = 80;
    const center = 100;
    
    const handleMouseEnter = (e, label, value, percentage) => {
      const rect = e.target.getBoundingClientRect();
      setTooltip({
        show: true,
        x: e.clientX,
        y: e.clientY,
        content: `${label}: ${value} (${Math.round(percentage * 100)}%)`
      });
    };
    
    const handleMouseLeave = () => {
      setTooltip({ show: false, x: 0, y: 0, content: '' });
    };
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <svg width="200" height="200">
          {sortedEntries.map(([label, value], idx) => {
            const percentage = value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            // Calculate path
            const x1 = center + radius * Math.cos(startAngle * Math.PI / 180);
            const y1 = center + radius * Math.sin(startAngle * Math.PI / 180);
            const x2 = center + radius * Math.cos(endAngle * Math.PI / 180);
            const y2 = center + radius * Math.sin(endAngle * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const pathData = [
              'M', center, center,
              'L', x1, y1,
              'A', radius, radius, 0, largeArcFlag, 1, x2, y2,
              'Z'
            ].join(' ');
            
            // Calculate label position (middle of the arc)
            const midAngle = (startAngle + endAngle) / 2;
            const labelRadius = radius * 0.7;
            const labelX = center + labelRadius * Math.cos(midAngle * Math.PI / 180);
            const labelY = center + labelRadius * Math.sin(midAngle * Math.PI / 180);
            
            currentAngle = endAngle;
            
            return (
              <g key={label}>
                <path
                  d={pathData}
                  fill={getActivityColor(label)}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleMouseEnter(e, label, value, percentage)}
                  onMouseLeave={handleMouseLeave}
                />
                {percentage > 0.05 && ( // Only show label if segment is big enough
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#1f2937"
                    style={{ pointerEvents: 'none' }}
                  >
                    {showNumbers ? value : `${Math.round(percentage * 100)}%`}
                  </text>
                )}
                {percentage > 0.08 && ( // Show label name for larger segments
                  <text
                    x={labelX}
                    y={labelY + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="#6b7280"
                    style={{ pointerEvents: 'none' }}
                  >
                    {label.substring(0, 8)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {tooltip.show && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}>
            {tooltip.content}
          </div>
        )}
      </div>
    );
  };
  
  // Twin Gauge Chart for studying vs bursary comparison
  const GaugeChart = ({ value, max, label, color, size = 120 }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const angle = (percentage / 100) * 180; // Half circle (180 degrees)
    const radius = size / 2 - 10;
    const center = size / 2;
    
    // Calculate the arc path for the gauge
    const startAngle = 180; // Start from left (180 degrees)
    const endAngle = 180 - angle; // End based on percentage
    
    const x1 = center + radius * Math.cos(startAngle * Math.PI / 180);
    const y1 = center + radius * Math.sin(startAngle * Math.PI / 180);
    const x2 = center + radius * Math.cos(endAngle * Math.PI / 180);
    const y2 = center + radius * Math.sin(endAngle * Math.PI / 180);
    
    const largeArcFlag = angle > 90 ? 1 : 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg width={size} height={size * 0.75} style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          {percentage > 0 && (
            <path
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          {/* Center text */}
          <text
            x={center}
            y={center - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="18"
            fontWeight="700"
            fill="#1f2937"
          >
            {value}
          </text>
          <text
            x={center}
            y={center + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {Math.round(percentage)}%
          </text>
        </svg>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center'
        }}>
          {label}
        </div>
      </div>
    );
  };

  // Bar Chart Component
  const BarChart = ({ data, title }) => {
    const maxValue = Math.max(...Object.values(data));
    if (maxValue === 0) return <div>No data available</div>;
    
    // Special colors for studying vs bursary comparison
    const getBarColor = (label) => {
      if (label === 'Currently Studying') return '#87CEEB'; // Blue
      if (label === 'Have Bursaries') return '#98FB98'; // Green
      return pastelColors[Object.keys(data).indexOf(label) % pastelColors.length];
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
        {Object.entries(data).map(([label, value], idx) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ minWidth: '140px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>{label}</div>
            <div style={{
              flex: 1, height: '40px', backgroundColor: '#f0f0f0', borderRadius: '8px',
              position: 'relative', overflow: 'hidden', minWidth: '300px'
            }}>
              <div style={{
                width: `${Math.max((value / maxValue) * 100, 5)}%`, height: '100%',
                backgroundColor: getBarColor(label),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '14px', fontWeight: '700',
                minWidth: '50px'
              }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Line Chart Component
  const LineChart = ({ actualData, projectedData, title }) => {
    if (!actualData || !projectedData) return <div>No data available</div>;
    
    const width = 600;
    const height = 350;
    const padding = { top: 50, right: 60, bottom: 80, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Combine data for scaling
    const allData = [...actualData, ...projectedData];
    const maxValue = Math.max(...allData.map(d => d.value));
    const minYear = Math.min(...allData.map(d => d.year));
    const maxYear = Math.max(...allData.map(d => d.year));
    
    // Set fixed max value for better visualization
    const chartMaxValue = 1400;
    
    // Create scales
    const xScale = (year) => ((year - minYear) / (maxYear - minYear)) * chartWidth;
    const yScale = (value) => chartHeight - ((value / chartMaxValue) * chartHeight);
    
    // Create path data for actual line
    const actualPath = actualData.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.year)} ${yScale(d.value)}`
    ).join(' ');
    
    // Create path data for projected line
    const projectedPath = projectedData.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.year)} ${yScale(d.value)}`
    ).join(' ');
    
    // Connect actual and projected lines at the transition point
    const connectionYear = 2025;
    const connectionValue = actualData.find(d => d.year === connectionYear)?.value || 
                           actualData[actualData.length - 1]?.value || 0;
    
    const connectedProjectedPath = `M ${xScale(connectionYear)} ${yScale(connectionValue)} ` + 
      projectedData.map((d) => `L ${xScale(d.year)} ${yScale(d.value)}`).join(' ');
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <svg width={width} height={height} style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '12px', 
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {/* Chart background */}
          <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} 
                fill="#fafbfc" stroke="#e5e7eb" strokeWidth="1" rx="4"/>
          
          {/* Horizontal grid lines */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
              const y = chartHeight * percent;
              const value = Math.round(chartMaxValue * (1 - percent));
              return (
                <g key={i}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} 
                        stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2"/>
                  <text x="-10" y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                    {value}
                  </text>
                </g>
              );
            })}
          </g>
          
          {/* Main chart area */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Actual data line */}
            <path
              d={actualPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Projected data line (connected) */}
            <path
              d={connectedProjectedPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="8,4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Actual data points */}
            {actualData.map((d, i) => (
              <g key={`actual-${i}`}>
                <circle
                  cx={xScale(d.year)}
                  cy={yScale(d.value)}
                  r="5"
                  fill="white"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
                <text
                  x={xScale(d.year)}
                  y={yScale(d.value) - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1f2937"
                  fontWeight="600"
                >
                  {d.value}
                </text>
              </g>
            ))}
            
            {/* Projected data points */}
            {projectedData.map((d, i) => (
              <g key={`projected-${i}`}>
                <circle
                  cx={xScale(d.year)}
                  cy={yScale(d.value)}
                  r="5"
                  fill="white"
                  stroke="#10b981"
                  strokeWidth="3"
                />
                <text
                  x={xScale(d.year)}
                  y={yScale(d.value) - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1f2937"
                  fontWeight="600"
                >
                  {d.value}
                </text>
              </g>
            ))}
            
            {/* Year labels on x-axis */}
            {[...new Set([...actualData, ...projectedData].map(d => d.year))].map((year, i) => (
              <text
                key={`year-${i}`}
                x={xScale(year)}
                y={chartHeight + 25}
                textAnchor="middle"
                fontSize="12"
                fill="#1f2937"
                fontWeight="500"
              >
                {year}
              </text>
            ))}
            
            {/* Axis labels */}
            <text
              x={chartWidth / 2}
              y={chartHeight + 55}
              textAnchor="middle"
              fontSize="14"
              fill="#374151"
              fontWeight="600"
            >
              Year
            </text>
            <text
              x="-45"
              y={chartHeight / 2}
              textAnchor="middle"
              fontSize="14"
              fill="#374151"
              fontWeight="600"
              transform={`rotate(-90, -45, ${chartHeight / 2})`}
            >
              Number of Alumni
            </text>
          </g>
          
          {/* Legend */}
          <g transform={`translate(${width - 150}, 25)`}>
            <rect x="-10" y="-10" width="140" height="50" fill="white" 
                  stroke="#e5e7eb" strokeWidth="1" rx="6" opacity="0.95"/>
            
            <circle cx="5" cy="5" r="4" fill="#3b82f6"/>
            <line x1="1" y1="5" x2="9" y2="5" stroke="#3b82f6" strokeWidth="2"/>
            <text x="15" y="9" fontSize="12" fill="#1f2937" fontWeight="500">Actual</text>
            
            <circle cx="5" cy="25" r="4" fill="#10b981"/>
            <line x1="1" y1="25" x2="9" y2="25" stroke="#10b981" strokeWidth="2" strokeDasharray="4,2"/>
            <text x="15" y="29" fontSize="12" fill="#1f2937" fontWeight="500">Projected</text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Pathways Dashboard</title>
      </Head>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
      `}</style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#fafbfc',
        fontFamily: '"Poppins", sans-serif'
      }}>
        {/* Navigation */}
        <nav style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#1f2937',
              fontFamily: '"Montserrat", sans-serif'
            }}>Pathways</h1>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>CA STB Alumni Dashboard</div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ padding: '32px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              Error: {error}
            </div>
          )}

          {/* Stats Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Total Alumni</h3>
              <p style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: '700',
                color: '#1f2937'
              }}>{stats?.total || 0}</p>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Cohorts</h3>
              <p style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: '700',
                color: '#1f2937'
              }}>{Object.keys(stats?.cohorts || {}).length}</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Activity Distribution */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937'
              }}>Total Activity Distribution (all cohorts)</h3>
              {stats?.activities && Object.keys(stats.activities).length > 0 ? (
                <div style={{
                  display: 'flex',
                  gap: '32px',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: '0 0 auto'
                  }}>
                    <PieChart data={stats.activities} title="Total Activity Distribution (all cohorts)" />
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Pie Chart View
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: '0 0 auto'
                  }}>
                    <WaffleChart data={stats.activities} title="Total Activity Distribution (all cohorts)" />
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Waffle Chart View
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>No activity data available</div>
              )}
            </div>

            {/* Cohort Overview */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f3f4f6'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937'
              }}>Alumni per Cohort</h3>
              {stats?.cohorts && Object.keys(stats.cohorts).length > 0 ? (
                <BarChart data={stats.cohorts} title="Cohort Distribution" />
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>No cohort data available</div>
              )}
            </div>
          </div>

          {/* Activity Distribution by Cohort */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f3f4f6',
            marginTop: '32px'
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>Activity Distribution by Cohort</h3>
            {stats?.cohortActivities && Object.keys(stats.cohortActivities).length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px'
              }}>
                {Object.entries(stats.cohortActivities)
                  .sort(([a], [b]) => a.localeCompare(b)) // Sort cohorts alphabetically
                  .map(([cohort, activities]) => (
                  <div key={cohort} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#fafbfc'
                  }}>
                    <h4 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      textAlign: 'center'
                    }}>
                      {cohort} Cohort
                    </h4>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center',
                      marginBottom: '8px'
                    }}>
                      <PieChart data={activities} title={`${cohort} Activities`} />
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Total: {Object.values(activities).reduce((a, b) => a + b, 0)} alumni
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>No cohort activity data available</div>
            )}
          </div>

          {/* Studying vs Bursary Comparison */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f3f4f6',
            marginTop: '32px'
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>Studying Alumni & Bursary Recipients</h3>
            <div style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: '1',
                minWidth: '300px'
              }}>
                <BarChart 
                  data={{
                    'Currently Studying': stats?.studyingCount || 0,
                    'Have Bursaries': stats?.bursaryCount || 0
                  }} 
                  title="Study vs Bursary Comparison" 
                />
                <div style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Comparison of alumni currently studying vs. those with confirmed bursary funding
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: '1',
                minWidth: '400px', // Increased to accommodate external labels
                padding: '20px' // Added padding to prevent label cutoff
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  textAlign: 'center'
                }}>Qualification Types</h4>
                {stats?.studyingQualifications && Object.keys(stats.studyingQualifications).length > 0 ? (
                  <DonutChart 
                    data={stats.studyingQualifications} 
                    title="Studying Qualifications" 
                    centerText={stats?.studyingCount || 0}
                  />
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: '14px' }}>No qualification data available</div>
                )}
                <div style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Breakdown of qualification types for studying alumni
                </div>
              </div>
            </div>
          </div>

          {/* Alumni Projections */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f3f4f6',
            marginTop: '32px'
          }}>
            <h3 style={{
              margin: '0 0 24px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>Alumni Growth Projections</h3>
            <div style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: '1', minWidth: '400px' }}>
                <LineChart 
                  actualData={stats?.actualAlumniData || []}
                  projectedData={stats?.projectedAlumniData || []}
                  title="Alumni Growth Over Time"
                />
              </div>
              <div style={{ flex: '0 0 300px' }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  textAlign: 'center'
                }}>Projected Alumni by Campus (2030)</h4>
                <PieChart
                  data={{
                    'STB': 526, // 226 + 5*60
                    'KRN': 300, // 5*60
                    'PRL': 240  // 4*60
                  }}
                  title=""
                  showNumbers={true}
                />
                <div style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  STB: Current + 5 years growth<br/>
                  KRN & PRL: New campuses
                </div>
              </div>
            </div>
            <div style={{
              marginTop: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Historical data (2022-2025) and projected growth through 2030
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
