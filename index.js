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
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
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

                const data = await response.json();
                
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
                        <button id="cancelPost" class="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-300 active:scale-95">
                            <span class="flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                取消
                            </span>
                        </button>
                        <button id="confirmPost" class="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95" disabled>
                            <span class="flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                開始檢測
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
                    <button id="closeViolationModal" class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
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

        // 修改表單提交處理函數
        document.getElementById('postForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (isSubmitting) return;
            isSubmitting = true;
            
            const content = postContent.value;
            
            if (content.trim().length < minChars) {
                alert(`請輸入至少${minChars}字的內容`);
                isSubmitting = false;
                return;
            }

            try {
                // 獲取 IP 地址
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                const ipAddress = ipData.ip;

                // 創建並顯示確認對話框
                document.body.insertAdjacentHTML('beforeend', createConfirmationModal(content, ipAddress));
                
                const modal = document.getElementById('confirmationModal');
                const confirmBtn = document.getElementById('confirmPost');
                const cancelBtn = document.getElementById('cancelPost');
                const privacyCheck = document.getElementById('privacyCheck');

                // 隱私政策勾選處理
                privacyCheck.addEventListener('change', () => {
                    const checkboxBg = document.querySelector('.checkbox-bg');
                    const checkboxIcon = document.querySelector('.checkbox-icon');
                    
                    if (privacyCheck.checked) {
                        checkboxBg.classList.add('bg-indigo-500', 'border-indigo-500');
                        checkboxIcon.classList.remove('opacity-0', 'scale-90');
                        checkboxIcon.classList.add('opacity-100', 'scale-100');
                        confirmBtn.disabled = false;
                        confirmBtn.classList.add('hover:scale-105');
                    } else {
                        checkboxBg.classList.remove('bg-indigo-500', 'border-indigo-500');
                        checkboxIcon.classList.add('opacity-0', 'scale-90');
                        checkboxIcon.classList.remove('opacity-100', 'scale-100');
                        confirmBtn.disabled = true;
                        confirmBtn.classList.remove('hover:scale-105');
                    }
                });

                // 取消按鈕處理
                cancelBtn.addEventListener('click', () => {
                    modal.remove();
                    isSubmitting = false;
                });

                // 確認按鈕處理
                confirmBtn.addEventListener('click', async () => {
                    // 移除確認對話框
                    modal.remove();
                    
                    // 顯示檢測動畫
                    document.body.insertAdjacentHTML('beforeend', createCheckingModal());
                    const checkingModal = document.getElementById('checkingModal');

                    try {
                        // 進行 AI 內容審核
                        const moderationResult = await moderateContent(content);
                        
                        // 移除檢測動畫
                        checkingModal.remove();

                        if (!moderationResult.isValid) {
                            // 顯示違規內容模態框
                            document.body.insertAdjacentHTML('beforeend', createViolationModal(moderationResult.issues));
                            const violationModal = document.getElementById('violationModal');
                            const closeBtn = document.getElementById('closeViolationModal');
                            
                            closeBtn.addEventListener('click', () => {
                                violationModal.remove();
                                isSubmitting = false;
                            });
                            return;
                        }

                        // 顯示發送中動畫
                        document.body.insertAdjacentHTML('beforeend', createSendingModal());
                        const sendingModal = document.getElementById('sendingModal');

                        // 使用重試機制發布貼文
                        await retryOperation(async () => {
                            const batch = db.batch();
                            const postRef = db.collection('posts').doc();
                            
                            batch.set(postRef, {
                                content: content,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                ipAddress: ipAddress,
                                approved: false
                            });

                            await batch.commit();
                        });

                        // 移除發送中動畫
                        if (sendingModal) {
                            sendingModal.remove();
                        }

                        // 顯示成功動畫
                        document.body.insertAdjacentHTML('beforeend', createSuccessModal());
                        const successModal = document.getElementById('successModal');
                        
                        // 添加五彩紙屑效果
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        });

                        // 3秒後關閉成功提示並重置表單
                        setTimeout(() => {
                            if (successModal) {
                                successModal.remove();
                            }
                            postForm.reset();
                            charCount.textContent = '已輸入 0 字';
                            isSubmitting = false;
                        }, 3000);

                    } catch (error) {
                        console.error("發布過程出錯: ", error);
                        if (error.code === 'resource-exhausted') {
                            alert('系統暫時繁忙，請稍後再試。');
                        } else {
                            alert('發布失敗，請稍後再試。');
                        }
                        checkingModal.remove();
                        if (sendingModal) {
                            sendingModal.remove();
                        }
                        isSubmitting = false;
                    }
                });

            } catch (error) {
                console.error("發布過程出錯: ", error);
                alert('發布失敗，請稍後再試。');
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
    });
