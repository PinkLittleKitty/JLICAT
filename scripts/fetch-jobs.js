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
    <title>JLICAT</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e5e5e5;
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem 0;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.5rem;
        }

        .subtitle {
            color: #888;
            font-size: 1rem;
            margin-bottom: 1.5rem;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .stat {
            text-align: center;
        }

        .stat-number {
            font-size: 1.5rem;
            font-weight: 600;
            color: #4a9eff;
            display: block;
        }

        .stat-label {
            font-size: 0.875rem;
            color: #666;
        }

        .search-container {
            max-width: 600px;
            margin: 0 auto 3rem;
        }

        .search-input {
            width: 100%;
            padding: 1rem 1.5rem;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #e5e5e5;
            font-size: 1rem;
            transition: border-color 0.2s;
        }

        .search-input:focus {
            outline: none;
            border-color: #4a9eff;
        }

        .search-input::placeholder {
            color: #666;
        }

        .jobs-grid {
            display: grid;
            gap: 1.5rem;
        }

        .job-card {
            background: #111;
            border: 1px solid #222;
            border-radius: 12px;
            padding: 1.5rem;
            transition: all 0.2s ease;
        }

        .job-card:hover {
            border-color: #333;
            transform: translateY(-1px);
        }

        .job-header {
            margin-bottom: 1rem;
        }

        .job-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.5rem;
        }

        .company {
            color: #4a9eff;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }

        .location {
            color: #888;
            font-size: 0.875rem;
        }

        .job-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }

        .detail {
            background: #0f0f0f;
            padding: 0.75rem;
            border-radius: 6px;
            border: 1px solid #1a1a1a;
        }

        .detail-label {
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.25rem;
        }

        .detail-value {
            color: #e5e5e5;
            font-size: 0.875rem;
        }

        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }

        .skill-tag {
            background: #1a1a1a;
            color: #4a9eff;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            border: 1px solid #333;
        }

        .apply-btn {
            display: inline-block;
            background: #4a9eff;
            color: #000;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 0.875rem;
            margin-top: 1rem;
            transition: background 0.2s;
        }

        .apply-btn:hover {
            background: #3a8eef;
        }

        .notes {
            background: #1a1a0a;
            border: 1px solid #333300;
            color: #cccc88;
            padding: 0.75rem;
            border-radius: 6px;
            margin-top: 1rem;
            font-size: 0.875rem;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem 0;
            color: #666;
            font-size: 0.875rem;
            border-top: 1px solid #222;
        }

        .footer a {
            color: #4a9eff;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .no-results {
            text-align: center;
            padding: 3rem;
            color: #666;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats {
                gap: 1rem;
            }
            
            .job-details {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Job Listings I Could Apply To</h1>
            <div class="stats">
                <div class="stat">
                    <span class="stat-number">${jobs.length}</span>
                    <span class="stat-label">Jobs</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${new Set(jobs.map(job => job['Studio\n(Featured listings in blue)\n(Most recent in orange)'])).size}</span>
                    <span class="stat-label">Companies</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${new Set(jobs.map(job => job['Country'])).size}</span>
                    <span class="stat-label">Countries</span>
                </div>
            </div>
            <p style="color: #666; font-size: 0.875rem;">Updated ${lastUpdated}</p>
        </header>

        <div class="search-container">
            <input type="text" class="search-input" id="searchInput" placeholder="Search jobs, companies, or skills..." onkeyup="filterJobs()">
        </div>

        <div class="jobs-grid" id="jobsGrid">
            ${jobs.map(job => {
        const software = (job['Software/Programs\n(Required/Preferred)'] || '').split(',').map(s => s.trim()).filter(s => s);
        return `
                <article class="job-card" 
                    data-title="${(job['Job Title'] || '').replace(/"/g, '&quot;')}"
                    data-company="${(job['Studio\n(Featured listings in blue)\n(Most recent in orange)'] || '').replace(/"/g, '&quot;')}"
                    data-skills="${(job['Software/Programs\n(Required/Preferred)'] || '').replace(/"/g, '&quot;')}"
                    data-city="${(job['City'] || '').replace(/"/g, '&quot;')}"
                    data-country="${(job['Country'] || '').replace(/"/g, '&quot;')}">
                    <div class="job-header">
                        <h2 class="job-title">${job['Job Title'] || 'N/A'}</h2>
                        <div class="company">${job['Studio\n(Featured listings in blue)\n(Most recent in orange)'] || 'N/A'}</div>
                        <div class="location">${job['City'] || 'N/A'}, ${job['Country'] || 'N/A'}</div>
                    </div>
                    
                    <div class="job-details">
                        <div class="detail">
                            <div class="detail-label">Experience</div>
                            <div class="detail-value">${job['Experience Level'] || 'N/A'}</div>
                        </div>
                        <div class="detail">
                            <div class="detail-label">Work Type</div>
                            <div class="detail-value">${job[' On-Site/\nRemote/Hybrid'] || 'N/A'}</div>
                        </div>
                        <div class="detail">
                            <div class="detail-label">Posted</div>
                            <div class="detail-value">${job['Date'] || 'N/A'}</div>
                        </div>
                        <div class="detail">
                            <div class="detail-label">Skills</div>
                            <div class="detail-value">
                                ${software.length > 0 ?
                `<div class="skills">${software.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div>` :
                'N/A'
            }
                            </div>
                        </div>
                    </div>
                    
                    ${job['Source/Contact'] && job['Source/Contact'].startsWith('http') ?
                `<a href="${job['Source/Contact']}" target="_blank" class="apply-btn">Apply Now</a>` :
                ''
            }
                    
                    ${job['Notes\n(Some roles may be remote or hybrid although job descriptions may not specifically state this. Please check with the studio for further information.)'] ?
                `<div class="notes">${job['Notes\n(Some roles may be remote or hybrid although job descriptions may not specifically state this. Please check with the studio for further information.)']}</div>` :
                ''
            }
                </article>
            `}).join('')}
        </div>

        <div class="no-results" id="noResults" style="display: none;">
            <h3>No jobs found</h3>
            <p>Try adjusting your search terms</p>
        </div>

        <footer class="footer">
            <p><a href="jobs.json">JSON API</a> • Data from <a href="https://docs.google.com/spreadsheets/d/1eR2oAXOuflr8CZeGoz3JTrsgNj3KuefbdXJOmNtjEVM/edit?gid=0#gid=0">here</a></p>
        </footer>
    </div>

    <script>
        function filterJobs() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const jobCards = document.querySelectorAll('.job-card');
            let visibleCount = 0;

            jobCards.forEach(card => {
                const searchText = (
                    card.getAttribute('data-title') + ' ' +
                    card.getAttribute('data-company') + ' ' +
                    card.getAttribute('data-skills') + ' ' +
                    card.getAttribute('data-city') + ' ' +
                    card.getAttribute('data-country')
                ).toLowerCase();

                if (searchTerm === '' || searchText.includes(searchTerm)) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            document.getElementById('noResults').style.display = visibleCount === 0 ? 'block' : 'none';
        }
    </script>
</body>
</html>`;
}

fetchJobs();