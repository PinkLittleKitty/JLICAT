import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const SHEET_ID = '1eR2oAXOuflr8CZeGoz3JTrsgNj3KuefbdXJOmNtjEVM';

const CSV_URLS = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0&usp=sharing`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`
];

async function fetchCSVData() {
  for (const url of CSV_URLS) {
    try {
      console.log(`Trying URL: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`Failed with status: ${response.status}`);
        continue;
      }
      
      const csvData = await response.text();
      
      if (csvData.trim().startsWith('<!DOCTYPE html') || csvData.trim().startsWith('<html')) {
        console.log('Received HTML instead of CSV, trying next URL...');
        continue;
      }
      
      console.log('Valid CSV data received!');
      return csvData;
    } catch (error) {
      console.log(`Error with URL ${url}:`, error.message);
      continue;
    }
  }
  
  throw new Error('All CSV URL attempts failed. The Google Sheet may not be publicly accessible.');
}

async function fetchJobs() {
  try {
    console.log('Fetching jobs from Google Sheets...');
    const csvData = await fetchCSVData();
    
    console.log('Parsing CSV data...');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      escape: '"'
    });

    console.log(`Total records found: ${records.length}`);

    const filteredJobs = records.filter(job => {
      const workType = (job[' On-Site/\nRemote/Hybrid'] || '').toLowerCase();
      const software = (job['Software/Programs\n(Required/Preferred)'] || '').toLowerCase();
      
      const isRemote = workType.includes('remote') || workType.includes('all options');
      const hasUnityOrCSharp = software.includes('unity') || software.includes('c#') || software.includes('c++');
      
      return isRemote && hasUnityOrCSharp;
    });

    console.log(`Found ${filteredJobs.length} matching jobs`);
    
    const html = generateHTML(filteredJobs);
    fs.writeFileSync('index.html', html);
    
    fs.writeFileSync('jobs.json', JSON.stringify(filteredJobs, null, 2));
    
    console.log('Files generated successfully!');
    
  } catch (error) {
    console.error('Error fetching jobs:', error);
    process.exit(1);
  }
}

function generateHTML(jobs) {
  const lastUpdated = new Date().toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remote Unity/C# Jobs</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .job-card {
            background: white;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #007acc;
        }
        .job-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .company {
            font-size: 1.1em;
            color: #007acc;
            margin-bottom: 8px;
        }
        .location {
            color: #666;
            margin-bottom: 8px;
        }
        .details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        .detail-item {
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .apply-btn {
            display: inline-block;
            background: #007acc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 10px;
            transition: background 0.2s;
        }
        .apply-btn:hover {
            background: #005a9e;
        }
        .notes {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.9em;
        }
        .count {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 Remote Unity/C# Jobs</h1>
        <p class="count">${jobs.length} jobs found</p>
        <p><small>Last updated: ${lastUpdated}</small></p>
    </div>
    
    ${jobs.map(job => `
        <div class="job-card">
            <div class="job-title">${job['Job Title'] || 'N/A'}</div>
            <div class="company">${job['Studio\n(Featured listings in blue)\n(Most recent in orange)'] || 'N/A'}</div>
            <div class="location">📍 ${job['City'] || 'N/A'}, ${job['Province/State/Region'] || 'N/A'}, ${job['Country'] || 'N/A'}</div>
            
            <div class="details">
                <div class="detail-item">
                    <span class="detail-label">Experience:</span> ${job['Experience Level'] || 'N/A'}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Work Type:</span> ${job[' On-Site/\nRemote/Hybrid'] || 'N/A'}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Posted:</span> ${job['Date'] || 'N/A'}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Software:</span> ${job['Software/Programs\n(Required/Preferred)'] || 'N/A'}
                </div>
            </div>
            
            ${job['Source/Contact'] && job['Source/Contact'].startsWith('http') ? 
                `<a href="${job['Source/Contact']}" target="_blank" class="apply-btn">Apply Now</a>` : 
                `<div class="detail-item"><span class="detail-label">Contact:</span> ${job['Source/Contact'] || 'N/A'}</div>`
            }
            
            ${job['Notes\n(Some roles may be remote or hybrid although job descriptions may not specifically state this. Please check with the studio for further information.)'] ? 
                `<div class="notes"><strong>Notes:</strong> ${job['Notes\n(Some roles may be remote or hybrid although job descriptions may not specifically state this. Please check with the studio for further information.)']}</div>` : 
                ''
            }
        </div>
    `).join('')}
    
    <div style="text-align: center; margin-top: 40px; color: #666;">
        <p>Data sourced from public job listings spreadsheet</p>
        <p><a href="jobs.json">View as JSON</a></p>
    </div>
</body>
</html>`;
}

fetchJobs();