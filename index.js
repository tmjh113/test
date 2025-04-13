const firebaseConfig = {
  apiKey: "AIzaSyAMAA0gsjWARESJeQWIzy-RqwOrk40KRk0",
  authDomain: "nmcoin-cab04.firebaseapp.com",
  projectId: "nmcoin-cab04",
  storageBucket: "nmcoin-cab04.appspot.com",
  messagingSenderId: "26525674872",
  appId: "1:26525674872:web:54e9b4610ec263585dec8d",
  measurementId: "G-5689JZRHPD"
};

    // 初始化 Firebase
    firebase.initializeApp(firebaseConfig);

    // 獲取 Firestore 和 Storage 實例
    const db = firebase.firestore();
    const storage = firebase.storage();

    // 添加重試機制的輔助函數（放在文件開頭的配置後面）
    async function retryOperation(operation, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                if (error.code === 'resource-exhausted') {
                    // 如果是配額超出錯誤，等待後重試
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                    continue;
                }
                throw error;
            }
        }
    }

    // 確保所有 DOM 元素都存在後再使用
    document.addEventListener('DOMContentLoaded', () => {
        // 首先檢查必要的 DOM 元素是否存在
        const postContent = document.getElementById('postContent');
        const charCount = document.getElementById('charCount');
        const submitButton = document.getElementById('submitButton');

        // 檢查必要元素是否存在
        if (!postContent || !charCount || !submitButton) {
            console.error('找不到必要的表單元素');
            return;
        }

        let minChars = 3;

        function updateCharCount() {
            const currentLength = postContent.value.length;
            charCount.textContent = `已輸入 ${currentLength} 字`;
            
            if (currentLength < minChars) {
                charCount.classList.add('text-red-500');
            } else {
                charCount.classList.remove('text-red-500');
            }
        }

        postContent.addEventListener('input', updateCharCount);

        // 在表單提交事件處理中添加防止重複提交的邏輯
        let isSubmitting = false;

        // Gemini API 密鑰
        const GEMINI_API_KEY = 'AIzaSyBhvTxRKoP2iGUyeGsIi8X5ke-vNMvIvsw';

        // 修改內容審核函數
        async function moderateContent(content) {
            try {
                // 使用更新的 Gemini API URL - 修復 404 錯誤
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `分析以下內容是否包含不當內容。請只回傳一個JSON格式的結果，包含以下布林值屬性：bullying, publicInsult, defamation, conflict, violence, sexual, hate。不要包含任何其他文字。內容：${content}`
                            }]
                        }]
                    })
                });

                // 添加錯誤處理
                if (!response.ok) {
                    console.error('API 請求失敗:', response.status, response.statusText);
                    // 讓內容通過（預設為無違規內容）
                    return {
                        isValid: true,
                        issues: {
                            bullying: false,
                            publicInsult: false,
                            defamation: false,
                            conflict: false,
                            violence: false,
                            sexual: false,
                            hate: false
                        }
                    };
                }

                const data = await response.json();
                
                // 增強錯誤處理以檢查回應格式
                if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                    console.error('API 回應格式不符合預期:', data);
                    return {
                        isValid: true,
                        issues: {
                            bullying: false,
                            publicInsult: false,
                            defamation: false,
                            conflict: false,
                            violence: false,
                            sexual: false,
                            hate: false
                        }
                    };
                }
                
                // 解析 Gemini 的回應
                const responseText = data.candidates[0].content.parts[0].text;
                
                // 清理回應文字，只保留 JSON 部分
                const jsonStr = responseText.replace(/```json\n|\n```/g, '').trim();
                console.log('清理後的 JSON 字串：', jsonStr); // 用於調試
                
                let result;
                try {
                    result = JSON.parse(jsonStr);
                } catch (e) {
                    console.error('JSON 解析錯誤，原始回應：', responseText);
                    // 如果解析失敗，返回預設值
                    result = {
                        bullying: false,
                        publicInsult: false,
                        defamation: false,
                        conflict: false,
                        violence: false,
                        sexual: false,
                        hate: false
                    };
                }
                
                // 檢查是否有任何違規內容
                const hasViolation = Object.values(result).some(value => value === true);
                
                return {
                    isValid: !hasViolation,
                    issues: result
                };
            } catch (error) {
                console.error('內容審核出錯：', error);
                // 發生錯誤時返回預設值
                return {
                    isValid: true,
                    issues: {
                        bullying: false,
                        publicInsult: false,
                        defamation: false,
                        conflict: false,
                        violence: false,
                        sexual: false,
                        hate: false
                    }
                };
            }
        }

        // 修改確認對話框的 HTML 模板
        function createConfirmationModal(content, ipAddress) {
            return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" id="confirmationModal">
                <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 transform animate-slideIn shadow-2xl">
                    <!-- 標題區域 -->
                    <div class="text-center mb-8">
                        <h3 class="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">確認發布內容</h3>
                        <div class="mt-2 h-1 w-24 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
                    </div>
                    
                    <!-- 內容預覽 -->
                    <div class="mb-8 transform hover:scale-[1.02] transition-all duration-300">
                        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
                                <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                發布內容預覽
                            </h4>
                            <div class="prose max-w-none">
                                <p class="text-gray-600 whitespace-pre-wrap">${content}</p>
                            </div>
                        </div>
                    </div>

                    <!-- 發布資訊 -->
                    <div class="space-y-4 mb-8">
                        <div class="flex items-center p-4 bg-gray-50 rounded-lg transform hover:scale-[1.02] transition-all duration-300">
                            <svg class="w-6 h-6 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-gray-700">發布時間</p>
                                <p class="text-sm text-gray-500">${new Date().toLocaleString('zh-TW')}</p>
                            </div>
                        </div>
                        <div class="flex items-center p-4 bg-gray-50 rounded-lg transform hover:scale-[1.02] transition-all duration-300">
                            <svg class="w-6 h-6 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-gray-700">IP 位址</p>
                                <p class="text-sm text-gray-500">${ipAddress}</p>
                            </div>
                        </div>
                    </div>

                    <!-- 修改版規確認複選框 -->
                    <div class="mb-8">
                        <label class="flex items-center space-x-3 group cursor-pointer select-none">
                            <div class="relative flex-shrink-0">
                                <input type="checkbox" id="privacyCheck" class="hidden">
                                <div class="checkbox-bg w-6 h-6 border-2 border-gray-300 rounded-lg group-hover:border-indigo-500 transition-colors duration-200 ease-in-out">
                                    <div class="checkbox-icon absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-200 ease-in-out">
                                        <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 5.707 8.879a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <span class="text-sm text-gray-600 group-hover:text-gray-800 transition-colors duration-200 ease-in-out">
                                我已閱讀並同意
                                <a href="https://tmjh113.github.io/tmjhsafe/" target="_blank" class="text-indigo-500 hover:text-indigo-600 underline">乾淨天中版規</a>
                            </span>
                        </label>
                    </div>

                    <!-- 按鈕組 -->
                    <div class="flex space-x-4">
                        <button id="cancelPostBtn" class="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 active:scale-95">
                            <span class="flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                取消
                            </span>
                        </button>
                        <button id="confirmPostBtn" class="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95">
                            <span class="flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                開始發布
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }

        // 修改檢測動畫模態框
        function createCheckingModal() {
            return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" id="checkingModal">
                <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 transform animate-slideIn text-center">
                    <div class="checking-animation">
                        <div class="scanning-circle">
                            <div class="scanning-line"></div>
                            <svg class="scanning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                </path>
                            </svg>
                        </div>
                        <p class="text-xl font-medium text-gray-800 mt-6 mb-2">正在進行 AI 內容檢測</p>
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }

        // 添加違規內容顯示模態框
        function createViolationModal(issues) {
            let violationList = '';
            if (issues.bullying) violationList += '<li class="text-red-600">• 涉及校園霸凌</li>';
            if (issues.publicInsult) violationList += '<li class="text-red-600">• 涉及公然侮辱</li>';
            if (issues.defamation) violationList += '<li class="text-red-600">• 涉及誹謗</li>';
            if (issues.conflict) violationList += '<li class="text-red-600">• 可能起群眾紛爭</li>';
            if (issues.violence) violationList += '<li class="text-red-600">• 包含暴力內容</li>';
            if (issues.sexual) violationList += '<li class="text-red-600">• 包含不當性暗示</li>';
            if (issues.hate) violationList += '<li class="text-red-600">• 包含仇恨或歧視言論</li>';

            return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" id="violationModal">
                <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 transform animate-slideIn">
                    <h3 class="text-2xl font-bold mb-4 text-red-600">內容審核未通過</h3>
                    <p class="text-gray-700 mb-4">很抱歉，您的內容未通過 AI 審核，檢測到以下違規內容：</p>
                    <ul class="mb-6 space-y-2">
                        ${violationList}
                    </ul>
                    <button id="closeViolationBtn" class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                        關閉
                    </button>
                </div>
            </div>
            `;
        }

        // 添加發送中的動畫模態框
        function createSendingModal() {
            return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn" id="sendingModal">
                <div class="bg-white rounded-xl p-8 max-w-lg w-full mx-4 transform animate-slideIn text-center">
                    <div class="sending-animation mb-6">
                        <svg class="paper-plane mx-auto" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L12.7071 12.7071C12.3166 13.0976 11.6834 13.0976 11.2929 12.7071C10.9024 12.3166 10.9024 11.6834 11.2929 11.2929L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289Z" fill="#4F46E5"/>
                            <path d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L12.7071 12.7071C12.3166 13.0976 11.6834 13.0976 11.2929 12.7071L2.29289 3.70711C1.90237 3.31658 1.90237 2.68342 2.29289 2.29289C2.68342 1.90237 3.31658 1.90237 3.70711 2.29289L12 10.5858L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289Z" fill="#4F46E5"/>
                        </svg>
                    </div>
                    <p class="text-xl font-medium text-gray-800 mb-2">正在發送貼文</p>
                    <p class="text-gray-600">請稍候...</p>
                </div>
            </div>
            `;
        }

        // 修改成功動畫模態框，使用新的 SVG 打勾圖標、調整線條位置和大小，加入 overflow-hidden 並優化動畫
        function createSuccessModal() {
            return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn overflow-hidden" id="successModal">
                <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 transform animate-slideIn text-center relative">
                    <div class="mb-8 flex justify-center items-center">
                        <svg class="w-20 h-20" viewBox="0 0 52 52">
                            <circle class="path circle-animation" cx="26" cy="26" r="25" fill="none" stroke="#4CAF50" stroke-width="2" />
                            <path class="path check-animation" fill="none" stroke="#4CAF50" stroke-width="5" d="M14 27 L22 35 L38 19" />
                        </svg>
                    </div>
                    <div class="text-center mt-4">
                        <h3 class="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent inline-block">發布成功！</h3>
                        <p class="text-gray-600">您的貼文已送出審核</p>
                    </div>
                </div>
            </div>
            `;
        }

        // 註冊表單提交事件處理
        document.getElementById('postForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (isSubmitting) return; // 防止重複提交
            
            // 獲取貼文內容和圖片URL
            const content = postContent.value.trim();
            const imageUrl = document.getElementById('uploadedImageUrl').value.trim();
            
            // 檢查內容長度
            if (content.length < minChars && !imageUrl) {
                showToast(`貼文內容至少需要 ${minChars} 個字！`, 'error');
                return;
            }
            
            // 標記為正在提交
            isSubmitting = true;
            
            try {
                // 首先審核內容
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = createCheckingModal();
                document.body.appendChild(modalContainer.firstElementChild);
                
                // 獲取 IP 地址
                let ipAddress = 'unknown';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    if (ipResponse.ok) {
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    }
                } catch (error) {
                    console.error('獲取 IP 失敗：', error);
                }
                
                // 審核內容
                const moderationResult = await moderateContent(content);
                
                // 移除檢查中模態框
                document.getElementById('checkingModal')?.remove();
                
                if (!moderationResult.isValid) {
                    // 顯示違規模態框
                    const violationModal = document.createElement('div');
                    violationModal.innerHTML = createViolationModal(moderationResult.issues);
                    document.body.appendChild(violationModal.firstElementChild);
                    
                    // 關閉違規模態框按鈕事件
                    document.getElementById('closeViolationBtn').addEventListener('click', function() {
                        document.getElementById('violationModal').remove();
                    });
                    
                    isSubmitting = false;
                    return;
                }
                
                // 顯示確認模態框
                const modal = document.createElement('div');
                modal.innerHTML = createConfirmationModal(content, ipAddress);
                document.body.appendChild(modal.firstElementChild);
                
                // 設置複選框樣式交互
                const privacyCheck = document.getElementById('privacyCheck');
                const checkboxBg = document.querySelector('.checkbox-bg');
                const checkboxIcon = document.querySelector('.checkbox-icon');
                
                privacyCheck.addEventListener('change', function() {
                    if (this.checked) {
                        checkboxBg.classList.add('bg-indigo-500', 'border-indigo-500');
                        checkboxBg.classList.remove('border-gray-300');
                        checkboxIcon.classList.add('opacity-100', 'scale-100');
                        checkboxIcon.classList.remove('opacity-0', 'scale-90');
                    } else {
                        checkboxBg.classList.remove('bg-indigo-500', 'border-indigo-500');
                        checkboxBg.classList.add('border-gray-300');
                        checkboxIcon.classList.remove('opacity-100', 'scale-100');
                        checkboxIcon.classList.add('opacity-0', 'scale-90');
                    }
                });
                
                // 取消按鈕
                document.getElementById('cancelPostBtn').addEventListener('click', function() {
                    document.getElementById('confirmationModal').remove();
                    isSubmitting = false;
                });
                
                // 確認按鈕
                document.getElementById('confirmPostBtn').addEventListener('click', async function() {
                    const privacyCheck = document.getElementById('privacyCheck');
                    if (!privacyCheck.checked) {
                        alert('請先閱讀並同意版規');
                        return;
                    }
                    
                    // 關閉確認模態框
                    document.getElementById('confirmationModal').remove();
                    
                    // 顯示發送中模態框
                    const sendingModalContainer = document.createElement('div');
                    sendingModalContainer.innerHTML = createSendingModal();
                    document.body.appendChild(sendingModalContainer.firstElementChild);
                    
                    try {
                        // 生成唯一的用戶ID
                        const userId = generateUserId();
                        
                        // 處理圖片上傳
                        let finalImageUrl = null;
                        
                        if (imageUrl && imageUrl.startsWith('data:')) {
                            try {
                                // 生成一個唯一的文件名
                                const timestamp = new Date().getTime();
                                const randomString = Math.random().toString(36).substring(2, 8);
                                const fileName = `post_images/${userId}_${timestamp}_${randomString}.jpg`;
                                
                                // 從 base64 數據 URL 轉換為 Blob
                                const response = await fetch(imageUrl);
                                const blob = await response.blob();
                                
                                // 上傳至 Firebase Storage
                                const imageRef = storage.ref(fileName);
                                await imageRef.put(blob);
                                
                                // 獲取下載 URL
                                finalImageUrl = await imageRef.getDownloadURL();
                                console.log('圖片上傳成功:', finalImageUrl);
                            } catch (error) {
                                console.error('圖片上傳失敗:', error);
                                showToast('圖片上傳失敗，但貼文將繼續發布', 'warning');
                            }
                        }
                        
                        // 創建貼文對象
                        const post = {
                            content: content,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            likes: 0,
                            status: 'approved',
                            userId: userId,
                            ip: ipAddress,
                            imageUrl: finalImageUrl  // 使用上傳後的圖片 URL
                        };
                        
                        // 添加到 Firestore
                        await retryOperation(() => db.collection('posts').add(post));
                        
                        // 清空表單
                        postContent.value = '';
                        document.getElementById('uploadedImageUrl').value = '';
                        document.getElementById('previewImg').src = '';
                        document.getElementById('imagePreview').classList.add('hidden');
                        document.getElementById('imageUpload').value = ''; // 清空文件輸入
                        updateCharCount();
                        
                        // 移除發送中模態框
                        document.getElementById('sendingModal')?.remove();
                        
                        // 顯示成功模態框
                        const successModalContainer = document.createElement('div');
                        successModalContainer.innerHTML = createSuccessModal();
                        document.body.appendChild(successModalContainer.firstElementChild);
                        
                        // 啟動慶祝效果
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                        
                        // 3秒後關閉成功模態框
                        setTimeout(() => {
                            document.getElementById('successModal')?.remove();
                            
                            // 重新加載貼文
                            loadApprovedPosts();
                        }, 3000);
                    } catch (error) {
                        console.error('保存貼文失敗：', error);
                        document.getElementById('sendingModal')?.remove();
                        showToast('發布失敗，請稍後再試！', 'error');
                    } finally {
                        isSubmitting = false;
                    }
                });
            } catch (error) {
                console.error('處理提交時出錯：', error);
                showToast('發布過程中出錯，請稍後再試！', 'error');
                isSubmitting = false;
            }
        });

        // 移動端選單控制
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const nav = document.querySelector('nav');

        if (mobileMenuBtn && nav) {
            mobileMenuBtn.addEventListener('click', () => {
                nav.classList.toggle('show');
            });

            // 點擊導航欄外部時關閉選單
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    !nav.contains(e.target) && 
                    !mobileMenuBtn.contains(e.target)) {
                    nav.classList.remove('show');
                }
            });
        }

        // 全局變數，用於分頁
        let lastVisiblePost = null;
        let postsPerPage = 5;
        let isLoadingMore = false;

        // 修改貼文渲染函數，添加點讚功能
        function createPostElement(post) {
            const postElement = document.createElement('div');
            postElement.className = 'post-card p-6 bg-white/90 backdrop-blur-md rounded-xl shadow-sm mb-6 transform transition-all duration-300 hover:shadow-md';
            postElement.dataset.id = post.id;

            // 檢查 likes 字段是否存在，如果不存在則初始化為空數組
            const likes = post.likes || [];
            const likeCount = likes.length;

            // 生成隨機 ID 代表當前用戶（實際應用中應使用真實用戶ID）
            const currentUserId = localStorage.getItem('userId') || generateUserId();
            const hasLiked = likes.includes(currentUserId);

            // 檢查貼文是否包含圖片
            const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
            
            // 構建貼文 HTML 結構
            postElement.innerHTML = `
                <div class="mb-4">
                    <p class="text-gray-700 whitespace-pre-wrap">${post.content}</p>
                    ${hasImage ? `
                    <div class="post-image-container mt-3">
                        <img src="${post.imageUrl}" class="post-image max-h-80 rounded-lg mx-auto" alt="貼文圖片">
                    </div>
                    ` : ''}
                </div>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <div class="flex items-center space-x-2">
                        <button class="like-button flex items-center space-x-1 px-3 py-1 rounded-full ${hasLiked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors">
                            <svg class="w-4 h-4 ${hasLiked ? 'text-indigo-600' : 'text-gray-500'}" fill="${hasLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            <span class="like-count">${likeCount}</span>
                        </button>
                        <button class="reply-button flex items-center space-x-1 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            <span>回覆</span>
                        </button>
                    </div>
                    <time datetime="${new Date(post.createdAt.toDate()).toISOString()}" class="text-gray-400">${formatTimeAgo(post.createdAt.toDate())}</time>
                </div>
                <div class="replies-container hidden mt-4">
                    <div class="pl-4 border-l-2 border-indigo-100">
                        <div class="replies-list space-y-3 mb-3">
                            <!-- 回覆將在這裡被動態添加 -->
                        </div>
                        <form class="reply-form hidden mt-3">
                            <textarea class="w-full p-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" rows="2" placeholder="寫下你的回覆..."></textarea>
                            <div class="flex justify-end space-x-2 mt-2">
                                <button type="button" class="cancel-reply px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">取消</button>
                                <button type="submit" class="submit-reply px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">發送</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // 添加點讚事件監聽器
            const likeButton = postElement.querySelector('.like-button');
            likeButton.addEventListener('click', async () => {
                // 防止重複點擊
                if (likeButton.disabled) return;
                likeButton.disabled = true;
                
                try {
                    const postRef = db.collection('posts').doc(post.id);
                    
                    // 讀取最新的貼文數據
                    const postDoc = await postRef.get();
                    if (!postDoc.exists) {
                        showToast('貼文不存在', 'error');
                        likeButton.disabled = false;
                        return;
                    }
                    
                    const postData = postDoc.data();
                    const postLikes = postData.likes || [];
                    const userLiked = postLikes.includes(currentUserId);
                    
                    // 更新貼文點讚狀態
                    if (userLiked) {
                        // 取消點讚
                        await postRef.update({
                            likes: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                        });
                        
                        // 更新 UI
                        likeButton.classList.remove('bg-indigo-100', 'text-indigo-600');
                        likeButton.classList.add('bg-gray-100', 'hover:bg-gray-200');
                        const svg = likeButton.querySelector('svg');
                        svg.setAttribute('fill', 'none');
                        svg.classList.remove('text-indigo-600');
                        svg.classList.add('text-gray-500');
                        
                        const likeCount = postElement.querySelector('.like-count');
                        likeCount.textContent = parseInt(likeCount.textContent) - 1;
                    } else {
                        // 添加點讚
                        await postRef.update({
                            likes: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                        });
                        
                        // 更新 UI
                        likeButton.classList.remove('bg-gray-100', 'hover:bg-gray-200');
                        likeButton.classList.add('bg-indigo-100', 'text-indigo-600');
                        const svg = likeButton.querySelector('svg');
                        svg.setAttribute('fill', 'currentColor');
                        svg.classList.remove('text-gray-500');
                        svg.classList.add('text-indigo-600');
                        
                        const likeCount = postElement.querySelector('.like-count');
                        likeCount.textContent = parseInt(likeCount.textContent) + 1;
                    }
                } catch (error) {
                    console.error('點讚操作失敗：', error);
                    showToast('點讚操作失敗，請稍後再試', 'error');
                }
                
                likeButton.disabled = false;
            });

            // 回覆按鈕處理
            const replyButton = postElement.querySelector('.reply-button');
            const repliesContainer = postElement.querySelector('.replies-container');
            const replyForm = postElement.querySelector('.reply-form');

            replyButton.addEventListener('click', () => {
                // 加載回覆（如果尚未加載）
                if (!repliesContainer.classList.contains('loaded')) {
                    loadReplies(post.id);
                    repliesContainer.classList.add('loaded');
                }
                
                // 切換回覆表單和容器的顯示狀態
                repliesContainer.classList.toggle('hidden');
                
                // 如果容器顯示，則也顯示回覆表單
                if (!repliesContainer.classList.contains('hidden')) {
                    replyForm.classList.remove('hidden');
                }
            });

            // 回覆表單的取消按鈕
            const cancelReplyButton = postElement.querySelector('.cancel-reply');
            cancelReplyButton.addEventListener('click', () => {
                replyForm.classList.add('hidden');
                // 清空輸入內容
                replyForm.querySelector('textarea').value = '';
            });

            // 回覆表單提交
            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const replyContent = replyForm.querySelector('textarea').value.trim();
                if (!replyContent) return;
                
                const submitButton = replyForm.querySelector('.submit-reply');
                const cancelButton = replyForm.querySelector('.cancel-reply');
                
                // 防止重複提交
                submitButton.disabled = true;
                cancelButton.disabled = true;
                
                try {
                    // 創建新回覆
                    const reply = {
                        content: replyContent,
                        postId: post.id,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        approved: false, // 初始設置為未批准
                        published: false // 初始設置為未發布
                    };
                    
                    // 顯示回覆正在審核的訊息
                    const replyList = repliesContainer.querySelector('.replies-list');
                    const tempReplyElement = document.createElement('div');
                    tempReplyElement.className = 'bg-gray-50 p-3 rounded-lg relative overflow-hidden';
                    tempReplyElement.innerHTML = `
                        <p class="text-gray-500 text-sm mb-1">您的回覆正在審核中...</p>
                        <p class="text-gray-700">${replyContent}</p>
                        <div class="absolute bottom-0 left-0 w-full h-1 bg-indigo-200">
                            <div class="h-full bg-indigo-500 animate-pulse"></div>
                        </div>
                    `;
                    replyList.appendChild(tempReplyElement);
                    
                    // 添加到 Firestore
                    const replyRef = await db.collection('replies').add(reply);
                    
                    // 清空並隱藏回覆表單
                    replyForm.querySelector('textarea').value = '';
                    replyForm.classList.add('hidden');
                    
                    // 通知用戶
                    showToast('回覆已提交，待審核後將顯示', 'success');
                } catch (error) {
                    console.error('回覆提交失敗：', error);
                    showToast('回覆提交失敗，請稍後再試', 'error');
                }
                
                // 恢復按鈕狀態
                submitButton.disabled = false;
                cancelButton.disabled = false;
            });

            return postElement;
        }

        // 添加生成隨機用戶ID的函數
        function generateUserId() {
            const userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
            return userId;
        }

        // 修改載入已批准貼文的函數
        function loadApprovedPosts(isLoadingMore = false) {
            // 如果正在載入更多或非首次載入，則不顯示加載動畫
            if (!isLoadingMore) {
                const postsContainer = document.getElementById('approvedPostsContainer');
                if (!postsContainer) return;
                
                postsContainer.innerHTML = `
                    <div class="flex justify-center items-center py-12">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                `;
            }

            // 分頁變量
            const postsPerPage = 10;
            
            // 查詢參考 - 只獲取已發布的貼文
            let query = db.collection('posts')
                .where('published', '==', true)
                .orderBy('createdAt', 'desc');
            
            // 如果是載入更多，則從上次的最後一個文檔開始
            if (isLoadingMore && lastVisiblePost) {
                query = query.startAfter(lastVisiblePost);
            }
            
            // 限制查詢結果數量
            query = query.limit(postsPerPage);
            
            // 設置載入標誌
            isLoadingMore = true;
            
            // 執行查詢
            query.get().then((querySnapshot) => {
                const postsContainer = document.getElementById('approvedPostsContainer');
                if (!postsContainer) return;
                
                // 如果是第一次加載，清空容器
                if (!isLoadingMore) {
                    postsContainer.innerHTML = '';
                } else {
                    // 移除加載動畫
                    const loadingElement = postsContainer.querySelector('.loading-dots')?.parentElement;
                    if (loadingElement) {
                        postsContainer.removeChild(loadingElement);
                    }
                }
                
                // 檢查是否有結果
                if (querySnapshot.empty) {
                    if (!isLoadingMore) {
                        postsContainer.innerHTML = `
                            <div class="text-center py-12">
                                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                <p class="text-gray-500 text-lg">目前還沒有任何貼文</p>
                            </div>
                        `;
                    } else {
                        showToast('沒有更多貼文了', 'info');
                    }
                    
                    // 隱藏「加載更多」按鈕
                    const loadMoreButton = document.getElementById('load-more-button');
                    if (loadMoreButton) {
                        loadMoreButton.classList.add('hidden');
                    }
                    
                    return;
                }
                
                // 更新最後一個可見文檔
                lastVisiblePost = querySnapshot.docs[querySnapshot.docs.length - 1];
                
                // 處理每個貼文
                querySnapshot.forEach((doc) => {
                    const post = { id: doc.id, ...doc.data() };
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
                
                // 如果有超過 postsPerPage 的結果，顯示「加載更多」按鈕
                if (querySnapshot.docs.length >= postsPerPage) {
                    addLoadMoreButton(postsContainer);
                } else {
                    // 隱藏「加載更多」按鈕
                    const loadMoreButton = document.getElementById('load-more-button');
                    if (loadMoreButton) {
                        loadMoreButton.classList.add('hidden');
                    }
                }
                
                // 重置載入標誌
                isLoadingMore = false;
            }).catch((error) => {
                console.error('獲取貼文出錯：', error);
                showToast('獲取貼文失敗，請稍後再試', 'error');
                isLoadingMore = false;
            });
        }

        // 添加「顯示更多」按鈕
        function addLoadMoreButton(container) {
            // 移除現有的按鈕（如果存在）
            const existingButton = document.getElementById('load-more-button');
            if (existingButton) {
                existingButton.remove();
            }
            
            const loadMoreButton = document.createElement('div');
            loadMoreButton.id = 'load-more-button';
            loadMoreButton.className = 'text-center mt-6 mb-12';
            loadMoreButton.innerHTML = `
                <button class="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 shadow-sm hover:shadow flex items-center mx-auto">
                    <span>顯示更多</span>
                    <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            `;
            
            loadMoreButton.querySelector('button').addEventListener('click', () => {
                if (!isLoadingMore) {
                    isLoadingMore = true;
                    loadApprovedPosts(true);
                    isLoadingMore = false;
                }
            });
            
            container.appendChild(loadMoreButton);
        }

        // 載入帖子的回覆
        function loadReplies(postId) {
            const repliesContainer = document.getElementById(`replies-${postId}`);
            if (!repliesContainer) return;
            
            db.collection('posts').doc(postId).collection('replies')
                .orderBy('createdAt', 'asc')
                .get()
                .then(snapshot => {
                    repliesContainer.innerHTML = '';
                    
                    if (snapshot.empty) return;
                    
                    const replies = document.createElement('div');
                    replies.className = 'border-t border-gray-100 pt-4 mt-4 space-y-4';
                    
                    snapshot.forEach(doc => {
                        const reply = doc.data();
                        const replyDate = reply.createdAt ? reply.createdAt.toDate() : new Date();
                        const timeAgo = formatTimeAgo(replyDate);
                        
                        const replyElement = document.createElement('div');
                        replyElement.className = 'bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors duration-200';
                        replyElement.innerHTML = `
                            <div class="flex items-center mb-2">
                                <div class="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    R
                                </div>
                                <div class="ml-2">
                                    <p class="font-medium text-sm text-gray-700">匿名回覆</p>
                                    <p class="text-xs text-gray-500">${timeAgo}</p>
                                </div>
                            </div>
                            <p class="text-gray-700 whitespace-pre-wrap">${reply.content}</p>
                        `;
                        
                        replies.appendChild(replyElement);
                    });
                    
                    // 更新回覆計數
                    const repliesCount = snapshot.size;
                    const repliesCountElement = document.querySelector(`[data-post-id="${postId}"]`).closest('.post-card').querySelector('.replies-count');
                    if (repliesCountElement) {
                        repliesCountElement.textContent = repliesCount;
                    }
                    
                    repliesContainer.appendChild(replies);
                })
                .catch(error => {
                    console.error("載入回覆出錯: ", error);
                    repliesContainer.innerHTML = `
                        <div class="text-center py-3 mt-4 bg-red-50 rounded-lg">
                            <p class="text-red-500 text-sm">載入回覆時出錯</p>
                        </div>
                    `;
                });
        }
        
        // 時間格式化工具函數
        function formatTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) {
                return '剛剛';
            }
            
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) {
                return `${diffInMinutes} 分鐘前`;
            }
            
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) {
                return `${diffInHours} 小時前`;
            }
            
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 30) {
                return `${diffInDays} 天前`;
            }
            
            const diffInMonths = Math.floor(diffInDays / 30);
            if (diffInMonths < 12) {
                return `${diffInMonths} 個月前`;
            }
            
            const diffInYears = Math.floor(diffInMonths / 12);
            return `${diffInYears} 年前`;
        }

        // 添加提示通知功能
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 opacity-0 ${
                type === 'success' ? 'bg-green-500 text-white' : 
                type === 'error' ? 'bg-red-500 text-white' : 
                'bg-indigo-500 text-white'
            }`;
            toast.innerText = message;
            
            document.body.appendChild(toast);
            
            // 動畫顯示
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translate(-50%, -10px)';
            }, 10);
            
            // 3秒後消失
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translate(-50%, 10px)';
                
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }

        // 在頁面載入時載入帖子
        loadApprovedPosts();
        
        // 創建返回頂部按鈕函數
        function createBackToTopButton() {
            // 創建按鈕元素
            const backToTopButton = document.createElement('button');
            backToTopButton.id = 'backToTopBtn';
            backToTopButton.className = 'fixed bottom-8 right-8 bg-white rounded-full p-3 shadow-lg border border-indigo-100 opacity-0 invisible transition-all duration-300 hover:bg-indigo-50 hover:shadow-xl focus:outline-none z-50 transform hover:scale-110';
            backToTopButton.innerHTML = `
                <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
            `;
            
            // 添加到頁面
            document.body.appendChild(backToTopButton);
            
            // 監聽滾動事件
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    // 顯示按鈕
                    backToTopButton.classList.remove('opacity-0', 'invisible');
                    backToTopButton.classList.add('opacity-100');
                } else {
                    // 隱藏按鈕
                    backToTopButton.classList.remove('opacity-100');
                    backToTopButton.classList.add('opacity-0', 'invisible');
                }
            });
            
            // 添加點擊事件
            backToTopButton.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
        
        // 添加返回頂部按鈕
        createBackToTopButton();
    });
