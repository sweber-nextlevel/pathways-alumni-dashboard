import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    // Read the CSV file from public/data directory
    const csvPath = path.join(process.cwd(), 'public', 'data', 'standardized.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Data file not found' });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    const learners = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const learner = {};
      
      headers.forEach((header, index) => {
        learner[header] = values[index] || '';
      });
      
      learners.push(learner);
    }

    // Find cohort key
    const cohortKey = headers.find(h => 
      ['cohort_year', 'cohort', 'year'].includes(h.toLowerCase())
    ) || 'cohort_year';

    // Format response similar to your backend
    const formattedLearners = learners.map(r => {
      const cohort = r[cohortKey] || 'Unknown';
      const keep = {};
      
      // Keep essential fields
      ['alumid','campus','cohort_year','name','prefered_name','surname',
       'current_activity_type','institution','email','primary_phone',
       'employment_status','qualification_type','course','employer_name',
       'has_bursary'].forEach(field => {
        if (r[field] !== undefined) {
          keep[field] = r[field];
        }
      });
      
      keep['cohort'] = cohort;
      return keep;
    });

    res.status(200).json({ learners: formattedLearners });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
}