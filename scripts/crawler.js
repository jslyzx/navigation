const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://alans.site/';
const OUTPUT_FILE = path.join(__dirname, '../data/navigation.json');

/**
 * Delay for a given number of milliseconds
 * @param {number} ms 
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function crawl() {
  console.log(`Starting crawler for ${TARGET_URL}...`);
  
  try {
    // Fetch the page
    const response = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const navigation = {
      categories: []
    };

    let currentCategory = null;

    // Traverse all elements to maintain order
    $('*').each((i, el) => {
      const $el = $(el);
      
      if (el.tagName === 'h1') {
        const title = $el.text().trim();
        // Skip common non-category titles
        if (title && title !== 'Alans的导航站' && title !== '联系我' && title !== '常用推荐' || (title === '常用推荐')) {
          currentCategory = {
            id: $el.attr('id') || `category-${navigation.categories.length + 1}`,
            name: title,
            sites: []
          };
          navigation.categories.push(currentCategory);
        }
      } else if (el.tagName === 'h4' && currentCategory) {
        const siteName = $el.text().trim();
        
        // Find the link
        const $link = $el.find('a').length ? $el.find('a') : 
                      $el.closest('a').length ? $el.closest('a') : 
                      $el.parent().find('a');
        
        const url = $link.attr('href');
        
        if (url && url.startsWith('http')) {
          const $container = $el.closest('div');
          
          // Find description - usually in a p tag within the same container
          let description = $container.find('p').text().trim();
          
          // Find icon
          const icon = $container.find('img').attr('src') || '';

          // Avoid duplicates within the same category
          if (!currentCategory.sites.find(s => s.url === url)) {
            currentCategory.sites.push({
              name: siteName,
              url: url,
              icon: icon,
              description: description
            });
          }
        }
      }
    });

    // Remove empty categories
    navigation.categories = navigation.categories.filter(cat => cat.sites.length > 0);

    // Ensure directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(navigation, null, 2));
    console.log(`Successfully crawled ${navigation.categories.length} categories.`);
    console.log(`Data saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error during crawl:', error.message);
    process.exit(1);
  }
}

console.log('Waiting 1 second before starting...');
sleep(1000).then(crawl);
