const firebaseConfig = {
    apiKey: "AIzaSyAMAA0gsjWARESJeQWIzy-RqwOrk40KRk0",
    authDomain: "nmcoin-cab04.firebaseapp.com",
    projectId: "nmcoin-cab04",
    storageBucket: "nmcoin-cab04.appspot.com",
    messagingSenderId: "26525674872",
    appId: "1:26525674872:web:54e9b4610ec263585dec8d",
    measurementId: "G-5689JZRHPD"
  };
  
          // 初始 Firebase
          firebase.initializeApp(firebaseConfig);
          const db = firebase.firestore();
          // 獲取並顯示留言
          async function loadPosts() {
              const pendingContainer = document.getElementById('pendingPostsContainer');
              const approvedContainer = document.getElementById('approvedPostsContainer');
              
              pendingContainer.innerHTML = '<div class="loading">載入中...</div>';
              approvedContainer.innerHTML = '<div class="loading">載入中...</div>';
              
              try {
                  const [postsSnapshot, repliesSnapshot] = await Promise.all([
                      db.collection('posts')
                          .orderBy('postNumber', 'desc')
                          .limit(50)
                          .get({ source: 'server' }),
                      db.collection('postsrea')
                          .orderBy('postNumber', 'desc')
                          .limit(50)
                          .get({ source: 'server' })
                  ]);
  
                  pendingContainer.innerHTML = '';
                  approvedContainer.innerHTML = '';
  
                  if (postsSnapshot.empty && repliesSnapshot.empty) {
                      pendingContainer.innerHTML = '<div class="no-posts">目前還沒有待審核留言</div>';
                      approvedContainer.innerHTML = '<div class="no-posts">目前還沒有已批准留言</div>';
                  } else {
                      // 創建臨時數組來存儲所有元素
                      const pendingElements = [];
                      const approvedElements = [];
  
                      // 處理主要貼文
                      postsSnapshot.forEach(doc => {
                          const postData = doc.data();
                          const postElement = createPostElement(doc.id, postData, false);
                          
                          if (postData.approved) {
                              approvedElements.push(postElement);
                          } else {
                              pendingElements.push(postElement);
                          }
                      });
  
                      // 處理回覆貼文
                      repliesSnapshot.forEach(doc => {
                          const replyData = doc.data();
                          const replyElement = createPostElement(doc.id, replyData, true);
                          
                          if (replyData.status === 'approved') {
                              approvedElements.push(replyElement);
                          } else {
                              pendingElements.push(replyElement);
                          }
                      });
  
                      // 按照 postNumber 排序元素
                      const sortElements = (elements) => {
                          return elements.sort((a, b) => {
                              const aNumber = parseInt(a.querySelector('h3').textContent.match(/#(\d+)/)?.[1] || '0');
                              const bNumber = parseInt(b.querySelector('h3').textContent.match(/#(\d+)/)?.[1] || '0');
                              return bNumber - aNumber;  // 降序排序
                          });
                      };
  
                      // 排序並添加到容器
                      sortElements(pendingElements).forEach(element => {
                          pendingContainer.appendChild(element);
                      });
                      
                      sortElements(approvedElements).forEach(element => {
                          approvedContainer.appendChild(element);
                      });
                  }
              } catch (error) {
                  console.error("載入留言時發生錯誤：", error);
                  pendingContainer.innerHTML = '<div class="error-message">載入留言失敗，請稍後再試</div>';
                  approvedContainer.innerHTML = '<div class="error-message">載入留言失敗，請稍後再試</div>';
              }
          }
          // 添加敏感字詞列表和過濾功能
          const sensitiveWords = [
              { word: '李暈潔', mask: '李x潔' },
              { word: '李雨潔', mask: '李x潔' },
              { word: '23', mask: '2x' },
              { word: '班草', mask: '班x' },
              { word: '曖昧', mask: '互動' },
              // 新增班級和姓名遮蔽規則
              { word: '80331', mask: '8033x' },
              { word: '80332', mask: '8033x' },
              { word: '801', mask: '80x' },
              { word: '802', mask: '80x' },
              { word: '803', mask: '80x' },
              { word: '804', mask: '80x' },
              { word: '901', mask: '90x' },
              { word: '902', mask: '90x' },
              { word: '903', mask: '90x' },
              { word: '904', mask: '90x' },
              { word: '701', mask: '70x' },
              { word: '702', mask: '70x' },
              { word: '703', mask: '70x' },
              { word: '704', mask: '70x' },
              // 姓名最後一個字遮蔽模式
              { word: '林大明', mask: '林大x' },
              // 可以添加更多敏感詞和對應的遮罩
          ];
  
          // 過濾敏感詞函數 - 改進以支持更複雜的匹配和遮蔽
          function filterSensitiveContent(content) {
              // 防止非字符串輸入
              if (!content || typeof content !== 'string') {
                  return { 
                      filteredContent: String(content || ''), 
                      containsSensitiveWords: false, 
                      sensitiveWordsFound: [] 
                  };
              }
              
              let filteredContent = content;
              let containsSensitiveWords = false;
              let sensitiveWordsFound = [];
              
              // 先處理完整的敏感詞替換
              sensitiveWords.forEach(item => {
                  const regex = new RegExp(item.word, 'gi');
                  if (regex.test(filteredContent)) {
                      containsSensitiveWords = true;
                      sensitiveWordsFound.push(item.word);
                  }
                  filteredContent = filteredContent.replace(regex, item.mask);
              });
              
              // 檢測並遮蔽數字+特定詞組模式
              const numberPatterns = [
                  { pattern: /(\d+)(?=不要再自戀了)/gi, maskFunc: match => match.substring(0, match.length-1) + 'x' }
              ];
              
              numberPatterns.forEach(pattern => {
                  const matches = filteredContent.match(pattern.pattern);
                  if (matches && matches.length > 0) {
                      containsSensitiveWords = true;
                      sensitiveWordsFound.push('數字+自戀');
                  }
                  filteredContent = filteredContent.replace(pattern.pattern, pattern.maskFunc);
              });
              
              // 班級座號模式 (例如: 80331 -> 8033x, 70205 -> 7020x)
              const classNumberPattern = /\b([7-9]0[1-9])([0-9]{2})\b/g;
              const classNumberMatches = [...filteredContent.matchAll(classNumberPattern)];
              if (classNumberMatches.length > 0) {
                  containsSensitiveWords = true;
                  classNumberMatches.forEach(match => {
                      sensitiveWordsFound.push(`班級座號:${match[0]}`);
                  });
                  filteredContent = filteredContent.replace(classNumberPattern, (match, classNum, seatNum) => {
                      return classNum + seatNum.slice(0, -1) + "x";
                  });
              }
              
              // 三字姓名模式 (自動遮蔽最後一個字)
              const namePattern = /\b([\u4e00-\u9fa5]{2})([\u4e00-\u9fa5])\b/g;
              const nameMatches = [...filteredContent.matchAll(namePattern)];
              if (nameMatches.length > 0) {
                  containsSensitiveWords = true;
                  nameMatches.forEach(match => {
                      sensitiveWordsFound.push(`姓名:${match[0]}`);
                  });
                  filteredContent = filteredContent.replace(namePattern, '$1x');
              }
              
              // 確保返回的 filteredContent 始終是字符串類型
              return { 
                  filteredContent: String(filteredContent), 
                  containsSensitiveWords, 
                  sensitiveWordsFound 
              };
          }
  
          function createPostElement(docId, postData, isReply) {
              const postElement = document.createElement('div');
              postElement.className = 'post-card';
              postElement.setAttribute('data-post-id', docId);
              
              const timestamp = postData.createdAt?.toDate() || new Date();
              const formattedDate = timestamp.toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
              });
  
              let content, postNumber;
              if (isReply) {
                  // 應用敏感詞過濾
                  const filteredResult = filterSensitiveContent(postData.replyContent);
                  content = filteredResult.filteredContent || postData.replyContent;
                  postNumber = postData.postNumber ? `#${postData.postNumber}` : '未編號';
              } else {
                  // 應用敏感詞過濾
                  const filteredResult = filterSensitiveContent(postData.content);
                  content = filteredResult.filteredContent || postData.content;
                  postNumber = postData.postNumber ? `#${postData.postNumber}` : '未編號';
              }
  
              // 添加重新發布按鈕
              let actionButtons = '';
              if (isReply) {
                  if (postData.status === 'approved') {
                      actionButtons = `<button class="edit-btn" onclick="editPost('${docId}', true)">編輯</button>
                                      <button class="delete-btn" onclick="deleteReply('${docId}')">刪除</button>`;
                      // 如果已發布，添加重新發布按鈕
                      if (postData.published) {
                          actionButtons += `<button class="republish-btn" onclick="markForRepublish('${docId}', true)" style="background-color: #FF9800; color: white;">重新發布</button>`;
                      }
                  } else {
                      actionButtons = `<button class="edit-btn" onclick="editPost('${docId}', true)">編輯</button>
                                      <button class="approve-btn" onclick="approveReply('${docId}')">批准</button>
                                      <button class="delete-btn" onclick="deleteReply('${docId}')">刪除</button>`;
                  }
              } else {
                  if (postData.approved) {
                      actionButtons = `<button class="edit-btn" onclick="editPost('${docId}', false)">編輯</button>
                                      <button class="delete-btn" onclick="deletePost('${docId}')">刪除</button>`;
                      // 如果已發布，添加重新發布按鈕
                      if (postData.published) {
                          actionButtons += `<button class="republish-btn" onclick="markForRepublish('${docId}', false)" style="background-color: #FF9800; color: white;">重新發布</button>`;
                      }
                  } else {
                      actionButtons = `<button class="edit-btn" onclick="editPost('${docId}', false)">編輯</button>
                                      <button class="approve-btn" onclick="approvePost('${docId}')">批准</button>
                                      <button class="delete-btn" onclick="deletePost('${docId}')">刪除</button>`;
                  }
              }
  
              const publishedStatus = postData.published ? '已發布' : '未發布';
              const contentHtml = `<div class="post-content" ${isReply ? 'data-is-reply="true"' : ''}>${content}</div>`;
              postElement.innerHTML = `
                  <div class="post-header">
                      <h3>📝 ${isReply ? '回覆留言' : '最新匿名留言'} ${postNumber}</h3>
                      <span class="post-time">🕒 ${formattedDate}</span>
                  </div>
                  ${contentHtml}
                  ${postData.mediaUrls ? postData.mediaUrls.map(url => {
                      // 格式化時間
                      const formattedTime = timestamp.toLocaleString('zh-TW', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                      });
  
                      // 創建漸變背景樣式
                      const gradientStyle = `
                          background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.9));
                          box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
                          border-radius: 8px;
                          padding: 8px 12px;
                          font-weight: bold;
                          font-family: "Noto Sans TC", Arial;
                          line-height: 1.4;
                      `;
                      
                      if (url.type === 'image' || url.type === 'gif') {
                          return `<div class="media-wrapper" style="position: relative; display: inline-block;">
                                      <img src="${url.url}" alt="${url.type === 'image' ? '留言圖片' : '留言GIF'}" class="post-media" loading="lazy" 
                                           onload="checkImageContent(this, '${docId}')">
                                      <div class="media-info" style="position: absolute; top: 10px; right: 10px; ${gradientStyle}">
                                          <div style="font-size: 14px;">${postNumber}</div>
                                          <div style="font-size: 12px;">${formattedTime}</div>
                                      </div>
                                      <button onclick="testImageWatermark('${url.url}', '${postNumber.replace('#', '')}', new Date('${timestamp}'))" 
                                          class="test-watermark-btn" style="position: absolute; bottom: 10px; right: 10px; 
                                          background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; 
                                          padding: 6px 12px; cursor: pointer; font-size: 12px; transition: all 0.3s ease;">
                                          測試水印
                                      </button>
                                      <button onclick="checkImageContent(this.previousElementSibling.previousElementSibling, '${docId}', true)" 
                                          class="check-image-btn" style="position: absolute; bottom: 10px; left: 10px; 
                                          background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; 
                                          padding: 6px 12px; cursor: pointer; font-size: 12px; transition: all 0.3s ease;">
                                          檢查圖片
                                      </button>
                                  </div>`;
                      } else if (url.type === 'video') {
                          return `<div class="media-wrapper" style="position: relative; display: inline-block;">
                                      <video controls class="post-media" preload="metadata">
                                          <source src="${url.url}" type="video/mp4">
                                          您的瀏覽器不支持視頻標籤。
                                      </video>
                                      <div class="media-info" style="position: absolute; top: 10px; right: 10px; ${gradientStyle}">
                                          <div style="font-size: 14px;">${postNumber}</div>
                                          <div style="font-size: 12px;">${formattedTime}</div>
                                      </div>
                                  </div>`;
                      }
                  }).join('') : ''}
                  <div class="post-actions">
                      <button class="ai-check-btn" onclick="aiCheckPost(this, '${docId}')">AI審核</button>
                      ${actionButtons}
                  </div>
                  <div class="post-status">${publishedStatus}</div>
              `;
              return postElement;
          }
          // 新增批准貼文功能
          async function approvePost(docId) {
              try {
                  await db.collection('posts').doc(docId).update({ approved: true });
                  // 審核通過後自動重新編號所有貼文
                  if (typeof reNumberAllPosts === 'function') {
                      await reNumberAllPosts();
                  }
              } catch (error) {
                  console.error('批准貼文錯誤:', error);
                  alert('批准貼文失敗：' + error.message);
              }
          }
          // 新增刪除貼文功能
          async function deletePost(docId) {
              try {
                  const postElement = document.querySelector(`[data-post-id="${docId}"]`);
                  if (postElement) {
                      postElement.style.opacity = '0';
                      postElement.style.transform = 'scale(0.9)';
                      postElement.style.transition = 'all 0.3s ease';
                      
                      // 同時執行刪除操和動畫
                      await Promise.all([
                          db.collection('posts').doc(docId).delete(),
                          new Promise(resolve => setTimeout(resolve, 300))
                      ]);
                      
                      postElement.remove();
                  }
              } catch (error) {
                  console.error("刪除貼文時發生錯誤：", error);
                  alert("刪除貼文失敗，請稍後再試");
              }
          }
          // 輔助函數：獲取文件擴展
          function getFileExtension(url) {
              return url.split('.').pop().split(/\#|\?/)[0];
          }
          async function getCurrentPostNumber() {
              try {
                  // 只查詢最後一個編號，減少數據讀取
                  const [postsLast, repliesLast] = await Promise.all([
                      db.collection('posts')
                          .where('published', '==', true)
                          .orderBy('postNumber', 'desc')
                          .limit(1)
                          .get(),
                      db.collection('postsrea')
                          .where('published', '==', true)
                          .orderBy('postNumber', 'desc')
                          .limit(1)
                          .get()
                  ]);
  
                  let maxNumber = 0;
                  
                  if (!postsLast.empty) {
                      maxNumber = Math.max(maxNumber, postsLast.docs[0].data().postNumber || 0);
                  }
                  
                  if (!repliesLast.empty) {
                      maxNumber = Math.max(maxNumber, repliesLast.docs[0].data().postNumber || 0);
                  }
                  
                  return maxNumber + 1;
                  
              } catch (error) {
                  console.error("獲取貼文編號時發生錯誤：", error);
                  return 1;
              }
          }
          // 合併兩個集合的監聽器為一個
          function setupRealtimeListeners() {
              // 監聽新的待審核貼文
              const unsubscribePosts = db.collection('posts')
                  .where('approved', '==', false)
                  .onSnapshot(snapshot => {
                      snapshot.docChanges().forEach(change => {
                          if (change.type === 'added') {
                              const postData = change.doc.data();
                              console.log('新的主要貼文待審核：', change.doc.id);
                              autoAICheck(change.doc.id, postData.content, false);
                          }
                      });
                  }, error => {
                      console.error("監聽貼文錯誤：", error);
                  });
  
              // 監聽新的待審核回覆
              const unsubscribeReplies = db.collection('postsrea')
                  .where('status', '==', 'pending')
                  .onSnapshot(snapshot => {
                      snapshot.docChanges().forEach(change => {
                          if (change.type === 'added') {
                              const replyData = change.doc.data();
                              console.log('新的回覆待審核：', change.doc.id);
                              autoAICheck(change.doc.id, replyData.replyContent, true);
                          }
                      });
                  }, error => {
                      console.error("監聽回覆錯誤：", error);
                  });
  
              return () => {
                  unsubscribePosts();
                  unsubscribeReplies();
              };
          }
       // ... existing code ...

function setupRealtimeUpdates() {
    // 監聽主要貼文
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            handleDocChanges(snapshot, false);
        }, error => {
            console.error("監聽貼文錯誤：", error);
        });

    // 監聽回覆貼文
    db.collection('postsrea')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            handleDocChanges(snapshot, true);
        }, error => {
            console.error("監聽回覆錯誤：", error);
        });
}

// 修改 handleDocChanges 函數
function handleDocChanges(snapshot, isReply) {
    const pendingContainer = document.getElementById('pendingPostsContainer');
    const approvedContainer = document.getElementById('approvedPostsContainer');

    if (!pendingContainer || !approvedContainer) {
        console.error('找不到容器元素');
        return;
    }

    snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        const docId = change.doc.id;
        const element = document.querySelector(`[data-post-id="${docId}"]`);
        
        if (change.type === 'added' && !element) {
            const newElement = createPostElement(docId, data, isReply);
            const targetContainer = (isReply ? 
                (data.status === 'approved') : data.approved) ? 
                approvedContainer : pendingContainer;
            
            targetContainer.insertBefore(newElement, targetContainer.firstChild);
            
            // 如果是新的待審核貼文，觸發AI審核
            if ((!isReply && !data.approved) || (isReply && data.status === 'pending')) {
                autoAICheck(docId, isReply ? data.replyContent : data.content, isReply);
            }
        } else if (change.type === 'modified' && element) {
            const newElement = createPostElement(docId, data, isReply);
            const targetContainer = (isReply ? 
                (data.status === 'approved') : data.approved) ? 
                approvedContainer : pendingContainer;
            
            if (element.parentElement !== targetContainer) {
                element.remove();
                targetContainer.insertBefore(newElement, targetContainer.firstChild);
            } else {
                element.replaceWith(newElement);
            }
        } else if (change.type === 'removed' && element) {
            element.remove();
        }
    });
}

// 添加速率限制追蹤
const rateLimiter = {
    requests: {
        count: 0,
        limit: 14400,  // 每天請求限制
        resetTime: Date.now() + 24 * 60 * 60 * 1000
    },
    tokens: {
        count: 0,
        limit: 18000,  // 每分鐘令牌限制
        resetTime: Date.now() + 60 * 1000
    },
    async checkLimit() {
        const now = Date.now();
        
        // 重置每日請求計數
        if (now >= this.requests.resetTime) {
            this.requests.count = 0;
            this.requests.resetTime = now + 24 * 60 * 60 * 1000;
        }
        
        // 重置每分鐘令牌計數
        if (now >= this.tokens.resetTime) {
            this.tokens.count = 0;
            this.tokens.resetTime = now + 60 * 1000;
        }
        
        // 檢查限制
        if (this.requests.count >= this.requests.limit) {
            const waitTime = Math.ceil((this.requests.resetTime - now) / 1000);
            throw new Error(`已達到每日請求限制，請等待 ${waitTime} 秒`);
        }
        
        if (this.tokens.count >= this.tokens.limit) {
            const waitTime = Math.ceil((this.tokens.resetTime - now) / 1000);
            throw new Error(`已達到每分鐘令牌限制，請等待 ${waitTime} 秒`);
        }
    },
    updateLimits(headers) {
        // 更新限制信息
        if (headers.get('x-ratelimit-limit-requests')) {
            this.requests.limit = parseInt(headers.get('x-ratelimit-limit-requests'));
        }
        if (headers.get('x-ratelimit-limit-tokens')) {
            this.tokens.limit = parseInt(headers.get('x-ratelimit-limit-tokens'));
        }
        
        // 更新剩餘配額
        if (headers.get('x-ratelimit-remaining-requests')) {
            this.requests.count = this.requests.limit - parseInt(headers.get('x-ratelimit-remaining-requests'));
        }
        if (headers.get('x-ratelimit-remaining-tokens')) {
            this.tokens.count = this.tokens.limit - parseInt(headers.get('x-ratelimit-remaining-tokens'));
        }
    }
};

// 圖片內容檢查函數
async function checkImageContent(imgElement, docId, manual = false) {
    if (!imgElement || !imgElement.src) return;
    
    // 如果不是手動檢查，且圖片已經檢查過，則跳過
    if (!manual && imgElement.getAttribute('data-checked') === 'true') return;
    
    try {
        const GEMINI_API_KEY = 'AIzaSyBOEuiXHSOfTHe8qZ7dMt_qEJX6n_Igr-Y';
        const imageUrl = imgElement.src;
        
        // 轉換圖片為 base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // 調用 Gemini API 檢查圖片內容
        const apiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: "請分析這張圖片，檢查是否包含以下問題：1) 暴力內容 2) 色情或裸露內容 3) 可識別的真人臉。請返回一個 JSON 格式的結果，格式如下：\n{\n  \"hasFace\": true/false,\n  \"hasViolence\": true/false,\n  \"hasSexualContent\": true/false,\n  \"isProblematic\": true/false,\n  \"reason\": \"簡短說明問題\"\n}\n\n請注意：如果圖片中包含真人臉部特徵，即便是表情符號或漫畫，也請標記 hasFace 為 true。"
                            },
                            {
                                inline_data: {
                                    mime_type: blob.type,
                                    data: base64.split(',')[1]
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 800,
                    topP: 0.95
                }
            })
        });

        if (!apiResponse.ok) {
            throw new Error(`API 請求失敗: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();
        
        if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('無效的 API 回應格式');
        }

        // 解析 JSON 回應
        let cleanContent = result.candidates[0].content.parts[0].text.trim();
        cleanContent = cleanContent.replace(/```json\s*/g, '')
                               .replace(/```\s*/g, '')
                               .replace(/^\s*{\s*/, '{')
                               .replace(/\s*}\s*$/, '}')
                               .trim();
        
        if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
            throw new Error('API 回應不是有效的 JSON 格式');
        }

        const imageAnalysis = JSON.parse(cleanContent);
        
        // 標記圖片已檢查
        imgElement.setAttribute('data-checked', 'true');
        
        // 處理檢查結果 - 現在我們對所有問題內容都要自動刪除，包括有人臉的圖片
        if (imageAnalysis.hasFace || imageAnalysis.hasViolence || imageAnalysis.hasSexualContent || imageAnalysis.isProblematic) {
            // 添加視覺標記
            const wrapper = imgElement.closest('.media-wrapper');
            
            // 移除舊的警告標記
            const oldWarning = wrapper.querySelector('.image-warning');
            if (oldWarning) oldWarning.remove();
            
            // 添加新的警告標記
            const warningDiv = document.createElement('div');
            warningDiv.className = 'image-warning';
            warningDiv.style.position = 'absolute';
            warningDiv.style.top = '40px';
            warningDiv.style.left = '10px';
            warningDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            warningDiv.style.color = 'white';
            warningDiv.style.padding = '5px 10px';
            warningDiv.style.borderRadius = '5px';
            warningDiv.style.fontSize = '12px';
            
            let warningText = '';
            let deleteReason = '';
            
            if (imageAnalysis.hasFace) {
                warningText += '⚠️ 圖片包含人臉 ';
                deleteReason += '檢測到真人臉部特徵，';
            }
            if (imageAnalysis.hasViolence) {
                warningText += '⚠️ 暴力內容 ';
                deleteReason += '檢測到暴力內容，';
            }
            if (imageAnalysis.hasSexualContent) {
                warningText += '⚠️ 不適當內容 ';
                deleteReason += '檢測到裸露或色情內容，';
            }
            
            warningDiv.textContent = warningText;
            wrapper.appendChild(warningDiv);
            
            // 如果是手動檢查，顯示詳細結果
            if (manual) {
                alert(`圖片檢查結果:\n${JSON.stringify(imageAnalysis, null, 2)}`);
            }
            
            // 自動刪除所有有問題的圖片
            const postCard = document.querySelector(`[data-post-id="${docId}"]`);
            const resultDiv = document.createElement('div');
            resultDiv.className = 'ai-result ai-danger';
            
            // 格式化刪除原因
            deleteReason = deleteReason.replace(/，$/, '');
            if (!deleteReason) deleteReason = '圖片不符合發布規範';
            
            resultDiv.innerText = `圖片檢查結果：\n❌ ${deleteReason}，將自動刪除\n原因：${imageAnalysis.reason || '違反社群規範'}`;
            
            const actionsDiv = postCard.querySelector('.post-actions');
            postCard.insertBefore(resultDiv, actionsDiv);
            
            // 3秒後自動刪除
            setTimeout(() => {
                const isReply = postCard.querySelector('.post-content').hasAttribute('data-is-reply');
                if (isReply) {
                    deleteReply(docId);
                } else {
                    deletePost(docId);
                }
            }, 3000);
        }
    } catch (error) {
        console.error('圖片檢查失敗:', error);
        if (manual) {
            alert(`圖片檢查失敗: ${error.message}`);
        }
    }
}

// 輔助函數：Blob 轉 Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// 創建警示區域，如果不存在
function createAlertAreaIfNotExists() {
    if (!document.getElementById('alert-area')) {
        const alertArea = document.createElement('div');
        alertArea.id = 'alert-area';
        alertArea.className = 'alert-area';
        alertArea.style.position = 'fixed';
        alertArea.style.top = '20px';
        alertArea.style.right = '20px';
        alertArea.style.width = '300px';
        alertArea.style.maxHeight = '80vh';
        alertArea.style.overflowY = 'auto';
        alertArea.style.backgroundColor = 'rgba(255, 255, 200, 0.95)';
        alertArea.style.border = '2px solid #ffcc00';
        alertArea.style.borderRadius = '10px';
        alertArea.style.padding = '15px';
        alertArea.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        alertArea.style.zIndex = '9999';
        
        const title = document.createElement('h3');
        title.textContent = '需要審核的內容';
        title.style.marginTop = '0';
        title.style.borderBottom = '1px solid #ffcc00';
        title.style.paddingBottom = '5px';
        
        alertArea.appendChild(title);
        
        // 添加默認提示訊息
        const emptyMessage = document.createElement('div');
        emptyMessage.style.padding = '10px';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.textContent = '目前沒有需要審核的內容';
        
        alertArea.appendChild(emptyMessage);
        document.body.appendChild(alertArea);
    }
    
    return document.getElementById('alert-area');
}

// 添加內容到警示區域
function addToAlertArea(docId, content, filteredContent, sensitiveWords) {
    const alertArea = createAlertAreaIfNotExists();
    
    // 檢查是否已有相同 docId 的警示
    if (document.querySelector(`.alert-item[data-doc-id="${docId}"]`)) {
        return;
    }
    
    // 如果顯示的是默認提示，則清空警示區域
    if (alertArea.querySelector('div:not(.alert-item)')) {
        // 保留標題，清除其他內容
        const title = alertArea.querySelector('h3');
        alertArea.innerHTML = '';
        alertArea.appendChild(title);
    }
    
    const alertItem = document.createElement('div');
    alertItem.className = 'alert-item';
    alertItem.setAttribute('data-doc-id', docId);
    alertItem.style.marginBottom = '15px';
    alertItem.style.padding = '10px';
    alertItem.style.backgroundColor = 'white';
    alertItem.style.borderRadius = '5px';
    alertItem.style.border = '1px solid #ddd';
    
    // 確保所有輸入都是字符串
    const safeContent = typeof content === 'string' ? content : String(content || '');
    const safeFilteredContent = typeof filteredContent === 'string' ? filteredContent : String(filteredContent || '');
    
    // 處理敏感詞列表
    let safeSensitiveWords = [];
    if (Array.isArray(sensitiveWords)) {
        // 確保每個敏感詞項目都被轉換為字串
        safeSensitiveWords = sensitiveWords.map(word => {
            if (typeof word === 'string') return word;
            if (word === null || word === undefined) return '';
            // 如果是物件，嘗試取得其字串表示
            if (typeof word === 'object') {
                return word.hasOwnProperty('word') ? word.word : 
                       word.hasOwnProperty('name') ? word.name : 
                       JSON.stringify(word);
            }
            return String(word);
        });
    } else if (sensitiveWords !== null && sensitiveWords !== undefined) {
        // 如果不是數組但是物件，嘗試從物件中提取有用信息
        if (typeof sensitiveWords === 'object') {
            safeSensitiveWords = [
                sensitiveWords.hasOwnProperty('word') ? sensitiveWords.word : 
                sensitiveWords.hasOwnProperty('name') ? sensitiveWords.name :
                JSON.stringify(sensitiveWords)
            ];
        } else {
            safeSensitiveWords = [String(sensitiveWords)];
        }
    }
    
    // 過濾空值
    safeSensitiveWords = safeSensitiveWords.filter(word => word && word.trim() !== '');
    
    // 如果沒有敏感詞，顯示"未指定"
    const sensitiveWordsText = safeSensitiveWords.length > 0 ? safeSensitiveWords.join(', ') : '未指定';
    
    alertItem.innerHTML = `
        <div style="margin-bottom: 5px;">
            <strong>原內容:</strong> <span style="color: #cc0000;">${safeContent}</span>
        </div>
        <div style="margin-bottom: 10px;">
            <strong>過濾後:</strong> <span style="color: #006600;">${safeFilteredContent}</span>
        </div>
        <div style="margin-bottom: 10px;">
            <strong>敏感詞:</strong> <span style="color: #cc0000;">${sensitiveWordsText}</span>
        </div>
        <div style="display: flex; gap: 10px;">
            <button class="approve-alert-btn" style="flex: 1; background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                批准過濾後內容
            </button>
            <button class="delete-alert-btn" style="flex: 1; background: #F44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                刪除貼文
            </button>
        </div>
    `;
    
    // 添加按鈕事件
    alertArea.appendChild(alertItem);
    
    // 批准按鈕
    alertItem.querySelector('.approve-alert-btn').addEventListener('click', async () => {
        try {
            // 獲取該貼文元素
            const postElement = document.querySelector(`[data-post-id="${docId}"]`);
            const isReply = postElement.querySelector('.post-content').hasAttribute('data-is-reply');
            
            // 更新內容到資料庫
            const collection = isReply ? 'postsrea' : 'posts';
            const field = isReply ? 'replyContent' : 'content';
            
            await db.collection(collection).doc(docId).update({
                [field]: filteredContent,
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 如果是回覆，標記為已批准
            if (isReply) {
                await approveReply(docId);
            } else {
                await approvePost(docId);
            }
            
            // 更新UI顯示
            const contentElement = postElement.querySelector('.post-content');
            if (contentElement) {
                contentElement.innerHTML = filteredContent;
            }
            
            // 從警示區移除
            alertItem.remove();
            
            // 如果警示區為空，添加提示
            if (alertArea.querySelectorAll('.alert-item').length === 0) {
                alertArea.innerHTML = '<h3 style="margin-top: 0; border-bottom: 1px solid #ffcc00; padding-bottom: 5px;">需要審核的內容</h3><div style="padding: 10px; text-align: center;">目前沒有需要審核的內容</div>';
            }
        } catch (error) {
            console.error('批准內容時發生錯誤:', error);
            alert('更新失敗: ' + error.message);
        }
    });
    
    // 刪除按鈕
    alertItem.querySelector('.delete-alert-btn').addEventListener('click', async () => {
        try {
            // 獲取該貼文元素
            const postElement = document.querySelector(`[data-post-id="${docId}"]`);
            const isReply = postElement.querySelector('.post-content').hasAttribute('data-is-reply');
            
            // 刪除貼文
            if (isReply) {
                await deleteReply(docId);
            } else {
                await deletePost(docId);
            }
            
            // 從警示區移除
            alertItem.remove();
            
            // 如果警示區為空，添加提示
            if (alertArea.querySelectorAll('.alert-item').length === 0) {
                alertArea.innerHTML = '<h3 style="margin-top: 0; border-bottom: 1px solid #ffcc00; padding-bottom: 5px;">需要審核的內容</h3><div style="padding: 10px; text-align: center;">目前沒有需要審核的內容</div>';
            }
        } catch (error) {
            console.error('刪除內容時發生錯誤:', error);
            alert('刪除失敗: ' + error.message);
        }
    });
}

// 修改 autoAICheck 函數，將遮蔽系統全部交由 Gemini 來完成
async function autoAICheck(docId, content, isReply = false) {
    try {
        // 不再使用本地敏感詞過濾，直接使用 Gemini
        const GEMINI_API_KEY = 'AIzaSyBOEuiXHSOfTHe8qZ7dMt_qEJX6n_Igr-Y';
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `你是一個內容審核助手。請分析提供的內容並返回一個 JSON 對象，格式如下：
{
    "isSafe": true/false,
    "issues": {
        "bullying": false,
        "publicInsult": false,
        "defamation": false,
        "conflict": false,
        "violence": false,
        "sexual": false,
        "hate": false,
        "privacy": false,
        "minorProtection": false
    },
    "reason": "如有問題請說明",
    "filteredContent": "如果內容中有敏感詞，返回過濾後的內容",
    "shouldDelete": false
}

特別注意：
1. 如有班級座號(例如801, 80331等)，應當進行遮蔽：例如801→80x，80331→8033x
2. 如有姓名，應當遮蔽中間的字：例如林大中→林x中，王小美→王x美，李雨潔→李x潔
3. 如有侮辱、暴力、色情等嚴重違規內容，則將 shouldDelete 設為 true
4. 如果內容基本符合規範，但包含個人資訊，則進行遮蔽處理，但不刪除
5. 以下是需要進行遮蔽的規則：
   - 所有班級號碼，如701, 801, 901等變成70x, 80x, 90x
   - 所有完整班級座號，如80331變成8033x (最後一位數字遮蔽)
   - 所有姓名的中間字需遮蔽，如李雨潔變成李x潔，林大中變成林x中，兩字姓名如李明則不變
   - 特定敏感詞如「班草」變成「班x」，「曖昧」變成「互動」等
6. 請務必審慎評估是否需要刪除，僅在內容明顯違規時才設置 shouldDelete = true

請分析以下內容，檢查是否存在違規或含有個人隱私的資訊：
${content}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1000,
                    topP: 0.95
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`API 請求失敗: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`);
        }

        const apiResponse = await response.json();
        
        if (!apiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('無效的 API 回應格式');
        }

        let cleanContent = apiResponse.candidates[0].content.parts[0].text.trim();
        
        // 嘗試移除任何可能的 markdown 或其他格式
        cleanContent = cleanContent.replace(/```json\s*/g, '')
                                 .replace(/```\s*/g, '')
                                 .replace(/^\s*{\s*/, '{')
                                 .replace(/\s*}\s*$/, '}')
                                 .trim();

        // 確保內容是有效的 JSON
        if (!cleanContent.startsWith('{') || !cleanContent.endsWith('}')) {
            throw new Error('API 回應不是有效的 JSON 格式');
        }

        let result;
        try {
            result = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON 解析錯誤:', parseError);
            console.log('嘗試解析的內容:', cleanContent);
            throw new Error('無法解析 AI 回應的 JSON 格式');
        }

        // 處理 AI 審核結果顯示
        const postCard = document.querySelector(`[data-post-id="${docId}"]`);
        if (postCard) {
            const oldResult = postCard.querySelector('.ai-result');
            if (oldResult) {
                oldResult.remove();
            }

            // 檢查是否需要直接刪除
            if (result.shouldDelete === true) {
                // 創建結果顯示
                const resultDiv = document.createElement('div');
                resultDiv.className = 'ai-result ai-danger';
                resultDiv.innerText = `AI 審核結果：\n❌ 檢測到嚴重違規內容，將直接刪除\n原因：${result.reason}`;
                postCard.insertBefore(resultDiv, postCard.querySelector('.post-actions'));
                
                // 延遲 2 秒後自動刪除
                setTimeout(async () => {
                    const isReply = postCard.querySelector('.post-content').hasAttribute('data-is-reply');
                    if (isReply) {
                        await deleteReply(docId);
                    } else {
                        await deletePost(docId);
                    }
                }, 2000);
                
                return;
            }

            // 檢查是否需要更新過濾後的內容
            if (result.filteredContent && result.filteredContent !== content) {
                const contentElement = postCard.querySelector('.post-content');
                if (contentElement) {
                    // 更新顯示的內容 - 確保是字符串
                    contentElement.innerHTML = String(result.filteredContent);
                    
                    // 同時更新資料庫中的內容
                    const collection = isReply ? 'postsrea' : 'posts';
                    const field = isReply ? 'replyContent' : 'content';
                    
                    try {
                        await db.collection(collection).doc(docId).update({
                            [field]: String(result.filteredContent),
                            lastModified: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('已更新過濾後的內容到資料庫');
                    } catch (updateError) {
                        console.error('更新過濾內容失敗:', updateError);
                    }
                }
            }

            // 創建新的結果顯示
            const resultDiv = document.createElement('div');
            resultDiv.className = `ai-result ${result.isSafe ? 'ai-safe' : 'ai-warning'}`;
            
            if (result.isSafe) {
                resultDiv.innerText = 'AI 審核結果：\n✅ 內容安全，已自動批准';
                // 自動批准
                const approveBtn = postCard.querySelector('.approve-btn');
                if (approveBtn) {
                    approveBtn.click();
                }
            } else {
                // 有問題但不需要刪除，顯示已過濾訊息
                let resultText = 'AI 審核結果：\n⚠️ 檢測到敏感內容，已自動過濾：\n';
                
                // 顯示具體問題
                Object.entries(result.issues).forEach(([key, value]) => {
                    if (value === true) {
                        const issueText = {
                            'bullying': '涉及校園霸凌',
                            'publicInsult': '涉及公然侮辱',
                            'defamation': '涉及誹謗',
                            'conflict': '可能起群眾紛爭',
                            'violence': '包含暴力內容',
                            'sexual': '包含不當性暗示',
                            'hate': '包含仇恨或歧視言論',
                            'privacy': '包含個人隱私資訊',
                            'minorProtection': '包含特定人名'
                        }[key] || key;
                        
                        resultText += `- ${issueText}\n`;
                    }
                });
                
                resultText += `\n原因：${result.reason}\n`;
                resultDiv.innerText = resultText;
                
                // 自動批准
                setTimeout(() => {
                    const approveBtn = postCard.querySelector('.approve-btn');
                    if (approveBtn) {
                        approveBtn.click();
                    }
                }, 1000);
            }
            
            postCard.insertBefore(resultDiv, postCard.querySelector('.post-actions'));
        }

    } catch (error) {
        console.error('AI 審核詳細錯誤:', error);
        const postCard = document.querySelector(`[data-post-id="${docId}"]`);
        if (postCard) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'ai-result ai-error';
            resultDiv.innerText = `AI 審核失敗: ${error.message}\n使用備用方法審核`;
            postCard.insertBefore(resultDiv, postCard.querySelector('.post-actions'));
            
            // 使用備用的 Gemini 請求進行簡單過濾
            try {
                backupContentFilter(docId, content, isReply);
            } catch (backupError) {
                console.error('備用過濾失敗:', backupError);
            }
        }
    }
}

// 備用內容過濾函數，使用更簡單的 Gemini 請求
async function backupContentFilter(docId, content, isReply) {
    try {
        const GEMINI_API_KEY = 'AIzaSyBOEuiXHSOfTHe8qZ7dMt_qEJX6n_Igr-Y';
        const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `請過濾以下內容的敏感資訊：
1. 將班級號碼改為模糊形式，如801改為80x
2. 將班級座號最後一位改為x，如80331改為8033x
3. 將姓名中間的字替換為x，如李雨潔改為李x潔，林大中改為林x中
4. 判斷內容是否違規（含色情、暴力、侮辱等），如果是則回覆"DELETE"

請僅返回過濾後的內容或"DELETE"指令，不要加任何其他說明。

內容：${content}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500
                }
            })
        });

        if (!response.ok) throw new Error('備用API請求失敗');
        
        const result = await response.json();
        const filteredText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (!filteredText) throw new Error('無效的備用API回應');
        
        // 檢查是否需要刪除
        if (filteredText === 'DELETE') {
            // 顯示將刪除的訊息
            const postCard = document.querySelector(`[data-post-id="${docId}"]`);
            if (postCard) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'ai-result ai-danger';
                resultDiv.innerText = '備用審核結果：\n❌ 檢測到違規內容，將刪除';
                postCard.insertBefore(resultDiv, postCard.querySelector('.post-actions'));
                
                // 延遲後刪除
                setTimeout(async () => {
                    if (isReply) {
                        await deleteReply(docId);
                    } else {
                        await deletePost(docId);
                    }
                }, 2000);
            }
            return;
        }
        
        // 更新內容
        const postCard = document.querySelector(`[data-post-id="${docId}"]`);
        if (postCard) {
            const contentElement = postCard.querySelector('.post-content');
            if (contentElement) {
                contentElement.innerHTML = filteredText;
                
                // 更新資料庫
                const collection = isReply ? 'postsrea' : 'posts';
                const field = isReply ? 'replyContent' : 'content';
                
                await db.collection(collection).doc(docId).update({
                    [field]: filteredText,
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 自動批准
                setTimeout(() => {
                    const approveBtn = postCard.querySelector('.approve-btn');
                    if (approveBtn) {
                        approveBtn.click();
                    }
                }, 1000);
            }
        }
    } catch (error) {
        console.error('備用過濾詳細錯誤:', error);
    }
}

// 手動觸發 AI 審核的功能也全部使用 Gemini
function aiCheckPost(button, docId) {
    const postCard = document.querySelector(`[data-post-id="${docId}"]`);
    if (!postCard) return;
    
    const contentElement = postCard.querySelector('.post-content');
    const content = contentElement.textContent;
    const isReply = contentElement.hasAttribute('data-is-reply');
    
    // 禁用按鈕，防止重複點擊
    button.disabled = true;
    button.textContent = '審核中...';
    
    // 執行審核
    autoAICheck(docId, content, isReply)
    .finally(() => {
        button.disabled = false;
        button.textContent = 'AI審核';
    });
    
    // 檢查該貼文的所有圖片
    const imageElements = postCard.querySelectorAll('img.post-media');
    imageElements.forEach(img => {
        checkImageContent(img, docId, true);
    });
}

// 修改 deleteReply 函數 (如果未定義)
async function deleteReply(docId) {
    try {
        const postElement = document.querySelector(`[data-post-id="${docId}"]`);
        if (postElement) {
            postElement.style.opacity = '0';
            postElement.style.transform = 'scale(0.9)';
            postElement.style.transition = 'all 0.3s ease';
            
            // 同時執行刪除操和動畫
            await Promise.all([
                db.collection('postsrea').doc(docId).delete(),
                new Promise(resolve => setTimeout(resolve, 300))
            ]);
            
            postElement.remove();
        }
    } catch (error) {
        console.error("刪除回覆時發生錯誤：", error);
        alert("刪除回覆失敗，請稍後再試");
    }
}

// 修改初始化代碼
document.addEventListener('DOMContentLoaded', () => {
    console.log('頁面載入完成，開始初始化...');
    
    // 首次載入資料
    loadPosts();
    
    // 設置即時更新監聽器
    setupRealtimeUpdates();
    setupRealtimeListeners();
});

// 添加編輯功能
async function editPost(docId, isReply) {
    const postElement = document.querySelector(`[data-post-id="${docId}"]`);
    const contentElement = postElement.querySelector('.post-content');
    const currentContent = contentElement.textContent;
    
    // 創建編輯框
    const textarea = document.createElement('textarea');
    textarea.value = currentContent;
    textarea.style.width = '100%';
    textarea.style.minHeight = '100px';
    textarea.style.marginBottom = '10px';
    
    // 創建保存和取消按鈕
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'approve-btn';
    saveBtn.style.marginRight = '10px';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'delete-btn';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    
    // 替換內容為編輯界面
    contentElement.innerHTML = '';
    contentElement.appendChild(textarea);
    contentElement.appendChild(buttonContainer);
    
    // 保存按鈕點擊事件
    saveBtn.onclick = async () => {
        const newContent = textarea.value.trim();
        if (!newContent) {
            alert('內容不能為空');
            return;
        }
        
        try {
            const collection = isReply ? 'postsrea' : 'posts';
            const field = isReply ? 'replyContent' : 'content';
            
            await db.collection(collection).doc(docId).update({
                [field]: newContent,
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 更新顯示
            contentElement.innerHTML = newContent;
            
            // 觸發 AI 審核
            autoAICheck(docId, newContent, isReply);
            
        } catch (error) {
            console.error('更新內容時發生錯誤:', error);
            alert('更新失敗，請稍後再試');
        }
    };
    
    // 取消按鈕點擊事件
    cancelBtn.onclick = () => {
        contentElement.innerHTML = currentContent;
    };
}

// 修改 reNumberAllPosts 函數，加入重複觸發過濾邏輯
async function reNumberAllPosts() {
    if (window._renumberLock) {
        console.log("重新編號已在進行中，跳過此次觸發");
        return;
    }
    const now = Date.now();
    // 若最近 10 秒內已呼叫過重新編號，則跳過此次調用
    if (window._lastReNumberTime && (now - window._lastReNumberTime < 10000)) {
        console.log("重新編號剛剛呼叫，不需要重複呼叫");
        return;
    }
    window._lastReNumberTime = now;
    window._renumberLock = true;
    try {
        // 獲取部分貼文和回覆（僅限最新 200 條記錄，可根據需要調整）
        const [postsSnapshot, repliesSnapshot] = await Promise.all([
            db.collection('posts')
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get(),
            db.collection('postsrea')
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get()
        ]);
  
        // 合併並按時間降序排序
        const allDocs = [
            ...postsSnapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data(),
                type: 'posts',
                timestamp: doc.data().createdAt?.toMillis() || 0
            })),
            ...repliesSnapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data(),
                type: 'postsrea',
                timestamp: doc.data().createdAt?.toMillis() || 0
            }))
        ].sort((a, b) => b.timestamp - a.timestamp);
  
        const totalDocs = allDocs.length;
        if (totalDocs === 0) {
            console.log("無需重新編號，沒有取得任何文檔。");
            await loadPosts();
            return;
        }
  
        // 批次更新，只對異動的文檔更新 postNumber
        const batch = db.batch();
        allDocs.forEach((doc, index) => {
            const ref = db.collection(doc.type).doc(doc.id);
            const newNumber = totalDocs - index;  // 降序
            if (doc.data.postNumber !== newNumber) {
                batch.update(ref, { postNumber: newNumber });
            }
        });
  
        await batch.commit();
        console.log(`重新編號完成，共處理 ${totalDocs} 個文檔 (僅更新異動項)`);
  
        await loadPosts();
  
    } catch (error) {
        console.error('重新編號過程中發生錯誤：', error);
        throw error;
    } finally {
        window._renumberLock = false;
    }
}

// 在頁面添加重新編號按鈕
document.addEventListener('DOMContentLoaded', () => {
    // 創建重新編號按鈕
    const renumberButton = document.createElement('button');
    renumberButton.textContent = '重新編號所有貼文';
    renumberButton.className = 'renumber-btn';
    renumberButton.onclick = async () => {
        if (confirm('確定要重新編號所有貼文嗎？這個操作無法撤銷。')) {
            try {
                renumberButton.disabled = true;
                renumberButton.textContent = '重新編號中...';
                await reNumberAllPosts();
                alert('重新編號完成！');
            } catch (error) {
                alert('重新編號失敗：' + error.message);
            } finally {
                renumberButton.disabled = false;
                renumberButton.textContent = '重新編號所有貼文';
            }
        }
    };

    // 將按鈕添加到適當的位置
    const container = document.querySelector('#approvedPostsContainer');
    if (container) {
        container.parentElement.insertBefore(renumberButton, container);
    }
});

// 添加測試函數
async function testImageWatermark(imageUrl, postNumber, timestamp) {
    try {
        // 下載圖片
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // 創建 canvas
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = URL.createObjectURL(blob);
        });

        // 設置 canvas 大小
        canvas.width = img.width;
        canvas.height = img.height;

        // 繪製原始圖片
        ctx.drawImage(img, 0, 0);

        // 格式化時間
        const formattedTime = timestamp.toLocaleString('zh-TW', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 設置字體和大小
        const padding = Math.max(15, img.width * 0.02);
        const fontSize = Math.max(20, Math.min(32, img.width * 0.035));
        ctx.font = `bold ${fontSize}px "Noto Sans TC", Arial`;

        // 計算文字尺寸
        const numberText = `#${postNumber}`;
        const timeText = formattedTime;
        const numberWidth = ctx.measureText(numberText).width;
        const timeWidth = ctx.measureText(timeText).width;
        const maxWidth = Math.max(numberWidth, timeWidth);

        // 繪製漸變背景
        const gradient = ctx.createLinearGradient(
            img.width - maxWidth - padding * 3,
            0,
            img.width,
            fontSize * 3
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');

        // 繪製圓角矩形背景
        const boxHeight = fontSize * 2.8;
        const radius = 8;
        const x = img.width - maxWidth - padding * 2;
        const y = padding;
        const width = maxWidth + padding * 2;
        const height = boxHeight;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x + radius, y);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();

        // 添加陰影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // 繪製文字
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(numberText, img.width - padding, y + fontSize + padding * 0.5);
        ctx.fillText(timeText, img.width - padding, y + fontSize * 2 + padding * 0.5);

        // 創建下載連結
        const downloadLink = document.createElement('a');
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `test_watermark_${postNumber}.jpg`;
            downloadLink.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('測試水印生成失敗:', error);
        alert('測試失敗：' + error.message);
    }
}

async function approveReply(docId) {
    try {
        await db.collection('postsrea').doc(docId).update({ status: 'approved' });
        // 審核通過後自動重新編號所有貼文
        if (typeof reNumberAllPosts === 'function') {
            await reNumberAllPosts();
        }
    } catch (error) {
        console.error('批准回覆錯誤:', error);
        alert('批准回覆失敗：' + error.message);
    }
}

// 若尚未引用 debounce 函數，請新增此 debounce 函數
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// 初始化自動發布功能
function initializeAutoPublish() {
    // 創建一個防抖的重新編號函數
    const debouncedReNumber = debounce(reNumberAllPosts, 500);
    
    // 設置 MutationObserver 來監聽已批准貼文容器的變化
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 每次有新貼文進來時觸發重新編號與自動檢查
                debouncedReNumber();
                if (typeof window.autoCheckAndPublish === 'function') {
                    window.autoCheckAndPublish();
                } else {
                    console.warn('autoCheckAndPublish 函數未找到，請確保 publish.js 已正確載入');
                }
            }
        }
    });

    // 開始監聽已批准貼文容器
    const approvedContainer = document.getElementById('approvedPostsContainer');
    if (approvedContainer) {
        observer.observe(approvedContainer, { childList: true, subtree: true });
    } else {
        console.error('找不到已批准貼文容器');
    }
}

// 當 DOM 加載完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化自動發布功能...');
    initializeAutoPublish();
});

// 添加新函數：標記貼文為重新發布
async function markForRepublish(docId, isReply) {
    try {
        const collection = isReply ? 'postsrea' : 'posts';
        
        // 直接更新貼文狀態為未發布
        await db.collection(collection).doc(docId).update({
            published: false,
            instagramPostId: null,
            publishedAt: null
        });
        
        // 更新UI
        const postElement = document.querySelector(`[data-post-id="${docId}"]`);
        if (postElement) {
            const statusElement = postElement.querySelector('.post-status');
            if (statusElement) {
                statusElement.textContent = '未發布';
            }
            
            // 提示用戶
            const message = document.createElement('div');
            message.className = 'republish-message';
            message.style.backgroundColor = '#4CAF50';
            message.style.color = 'white';
            message.style.padding = '10px';
            message.style.marginTop = '10px';
            message.style.borderRadius = '5px';
            message.style.textAlign = 'center';
            message.textContent = '已將狀態更改為「未發布」，將在下一批發布時處理';
            
            // 插入到貼文底部
            postElement.appendChild(message);
            
            // 3秒後自動移除提示
            setTimeout(() => {
                message.remove();
            }, 3000);
            
            // 移除重新發布按鈕
            const republishBtn = postElement.querySelector('.republish-btn');
            if (republishBtn) {
                republishBtn.remove();
            }
        }
    } catch (error) {
        console.error('標記重新發布失敗:', error);
        alert('標記重新發布失敗: ' + error.message);
    }
}