/**
 * AI图片生成模块
 * 使用免费的 Pollinations.ai API (无需API密钥)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class ImageGenerator {
  constructor(config = {}) {
    this.config = {
      proxy: config.proxy || process.env.HTTP_PROXY || 'http://127.0.0.1:7897',
      baseUrl: 'https://image.pollinations.ai/prompt/',
      defaultSize: '1280x720',
      defaultStyle: 'digital art, high quality, detailed',
      timeout: 60000,
      ...config
    };
  }

  /**
   * 生成单张图片
   * @param {string} prompt - 图片描述
   * @param {string} outputPath - 输出路径
   * @param {object} options - 选项
   */
  async generate(prompt, outputPath, options = {}) {
    const size = options.size || this.config.defaultSize;
    const style = options.style || this.config.defaultStyle;
    const seed = options.seed || Math.floor(Math.random() * 1000000);
    
    // 构建完整prompt
    const fullPrompt = encodeURIComponent(`${prompt}, ${style}`);
    const url = `${this.config.baseUrl}${fullPrompt}?width=${size.split('x')[0]}&height=${size.split('x')[1]}&seed=${seed}&nologo=true`;
    
    console.log(`   🖼️ 生成图片: ${prompt.substring(0, 50)}...`);
    
    return new Promise((resolve, reject) => {
      const proxyUrl = new URL(this.config.proxy);
      
      const req = http.request({
        hostname: proxyUrl.hostname,
        port: proxyUrl.port,
        path: url,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // 跟随重定向
          const location = res.headers.location;
          this.downloadImage(location, outputPath)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          // 检查是否是图片
          if (buffer.length > 1000) {
            fs.writeFileSync(outputPath, buffer);
            console.log(`   ✅ 保存: ${path.basename(outputPath)}`);
            resolve(outputPath);
          } else {
            reject(new Error('Invalid image response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }

  /**
   * 下载图片
   */
  async downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
      const proxyUrl = new URL(this.config.proxy);
      const targetUrl = new URL(url);
      
      const req = http.request({
        hostname: proxyUrl.hostname,
        port: proxyUrl.port,
        path: targetUrl.href,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 1000) {
            fs.writeFileSync(outputPath, buffer);
            resolve(outputPath);
          } else {
            reject(new Error('Invalid image'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }

  /**
   * 批量生成图片
   * @param {array} prompts - prompt数组
   * @param {string} outputDir - 输出目录
   */
  async generateBatch(prompts, outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const outputPath = path.join(outputDir, `image_${String(i + 1).padStart(3, '0')}.png`);
      
      try {
        await this.generate(prompt.text, outputPath, prompt.options || {});
        results.push({ success: true, path: outputPath, prompt: prompt.text });
      } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
        results.push({ success: false, error: error.message, prompt: prompt.text });
      }
      
      // 避免请求过快
      if (i < prompts.length - 1) {
        await this.sleep(2000);
      }
    }

    return results;
  }

  /**
   * 为玄幻剧生成场景图片
   */
  async generateXianxiaScenes(outputDir, episodeNum = 1) {
    const scenes = [
      {
        text: `Chinese xianxia fantasy scene, magnificent immortal mountain peaks floating in clouds, golden sunlight breaking through mist, ancient temples on cliff edges, ethereal atmosphere, digital painting, 4k quality`,
        options: { seed: 1000 + episodeNum }
      },
      {
        text: `Young Chinese cultivator man in blue robes, black hair tied with green ribbon, handsome face with determined expression, standing on mountain peak, xianxia style, detailed portrait, digital art`,
        options: { seed: 2000 + episodeNum }
      },
      {
        text: `Beautiful Chinese immortal woman in white flowing dress, long silver hair, glowing with spiritual energy, surrounded by lotus flowers, ethereal beauty, xianxia fantasy art`,
        options: { seed: 3000 + episodeNum }
      },
      {
        text: `Ancient Chinese sect entrance gate, majestic stone pillars with dragon carvings, misty mountain background, disciples in white robes, traditional architecture, cinematic composition`,
        options: { seed: 4000 + episodeNum }
      },
      {
        text: `Sword fight scene between cultivators, glowing magical swords, dynamic action pose, energy waves, dramatic lighting, Chinese martial arts fantasy, epic battle`,
        options: { seed: 5000 + episodeNum }
      },
      {
        text: `Cultivation breakthrough moment, golden light explosion from meditating figure, spiritual energy swirling, dramatic transformation scene, xianxia enlightenment, powerful visualization`,
        options: { seed: 6000 + episodeNum }
      }
    ];

    return this.generateBatch(scenes, outputDir);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ImageGenerator;
