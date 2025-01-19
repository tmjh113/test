// 移除 import 語句，改用全局 firebase 對象
const firebaseConfig = {
    apiKey: "AIzaSyDskqG0dx4rkK6x6Jt_h2CzDhYYfqzdFF4",
    authDomain: "tmjhnew.firebaseapp.com",
    databaseURL: "https://tmjhnew-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tmjhnew",
    storageBucket: "tmjhnew.firebasestorage.app",
    messagingSenderId: "624200299812",
    appId: "1:624200299812:web:a0dea7f6829fffe124efb1",
    measurementId: "G-ZPV4SKNZBV"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 添加獲取用戶 IP 的函數
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Error getting IP:", error);
        return null;
    }
}

// 載入投票列表
async function loadVotes() {
    const votesRef = db.collection('votes');
    const q = votesRef.where('endTime', '>', new Date());
    
    try {
        const querySnapshot = await q.get();
        const voteList = document.getElementById('voteList');
        voteList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const voteData = doc.data();
            const voteCard = createVoteCard(doc.id, voteData);
            voteList.appendChild(voteCard);
        });
    } catch (error) {
        console.error("Error loading votes:", error);
    }
}

// 創建投票卡片
function createVoteCard(voteId, voteData) {
    const card = document.createElement('div');
    card.className = 'vote-card bg-white rounded-2xl shadow-xl p-6 transform transition-all hover:scale-[1.02]';
    
    const isExpired = new Date(voteData.endTime.toDate()) < new Date();
    const status = isExpired ? '已結束' : '進行中';
    const statusClass = isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

    const endTime = voteData.endTime.toDate();
    const formattedEndTime = endTime.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 獲取點讚數，如果不存在則設為0
    const likes = voteData.likes || 0;

    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h2 class="text-2xl font-bold text-gray-800">${voteData.title}</h2>
            <div class="flex items-center space-x-4">
                <button onclick="handleLike('${voteId}')" class="like-button flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-50 hover:bg-pink-100 transition-all">
                    <svg class="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                    <span class="likes-count text-pink-500 font-medium">${likes}</span>
                </button>
                <span class="px-4 py-1 rounded-full text-sm font-semibold ${statusClass}">
                    ${status}
                </span>
            </div>
        </div>
        <p class="text-gray-600 mb-4">${voteData.description}</p>
        <p class="text-sm text-gray-500 mb-6">結束時間：${formattedEndTime}</p>
        
        <div class="space-y-4" id="options-${voteId}">
            ${createOptionsHTML(voteId, voteData.options, voteData.totalVotes)}
        </div>
    `;

    return card;
}

// 修改創建選項 HTML 的函數
function createOptionsHTML(voteId, options, totalVotes) {
    return Object.entries(options).map(([optionId, option]) => {
        const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100).toFixed(1) : 0;
        return `
            <div class="option-container mb-4">
                <button onclick="handleVote('${voteId}', '${optionId}')" 
                        class="vote-button w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 flex justify-between items-center group">
                    <span class="text-lg font-medium text-gray-700 group-hover:text-indigo-600">${option.text}</span>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-semibold text-indigo-600">${option.votes} 票 (${percentage}%)</span>
                        <svg class="loading-spinner w-5 h-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <svg class="vote-success w-5 h-5 text-green-500 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                </button>
                <div class="relative mt-2">
                    <div class="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
                             style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 修改投票處理函數
async function handleVote(voteId, optionId) {
    const button = document.querySelector(`button[onclick="handleVote('${voteId}', '${optionId}')"]`);
    if (!button) return;

    // 添加載入狀態
    button.classList.add('loading');
    button.disabled = true;

    try {
        const userIP = await getUserIP();
        if (!userIP) {
            throw new Error('無法獲取IP地址');
        }

        const voteRef = db.collection('votes').doc(voteId);
        const ipRef = db.collection('vote_ips').doc(`${voteId}_${userIP}`);

        // 檢查是否已經投票
        const ipDoc = await ipRef.get();
        if (ipDoc.exists) {
            throw new Error('您已經參與過此投票');
        }

        let updatedVoteData;
        await db.runTransaction(async (transaction) => {
            const voteDoc = await transaction.get(voteRef);
            if (!voteDoc.exists) {
                throw new Error("投票不存在");
            }

            const voteData = voteDoc.data();
            
            if (new Date(voteData.endTime.toDate()) < new Date()) {
                throw new Error("投票已結束");
            }

            voteData.options[optionId].votes++;
            voteData.totalVotes++;

            transaction.update(voteRef, voteData);
            transaction.set(ipRef, {
                ip: userIP,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                voteId: voteId,
                optionId: optionId
            });

            updatedVoteData = voteData;
        });

        // 更新當前投票卡片的數據
        updateVoteCard(voteId, updatedVoteData);

        // 顯示成功圖標
        button.classList.remove('loading');
        const successIcon = button.querySelector('.vote-success');
        successIcon.classList.remove('hidden');
        successIcon.classList.add('show');

    } catch (error) {
        console.error("Error voting:", error);
        button.classList.remove('loading');
        button.disabled = false;
        
        const errorSpan = document.createElement('span');
        errorSpan.className = 'text-red-500 text-sm ml-2';
        errorSpan.textContent = error.message;
        button.parentNode.appendChild(errorSpan);
        setTimeout(() => errorSpan.remove(), 3000);
    }
}

// 添加更新投票卡片的函數
function updateVoteCard(voteId, voteData) {
    const optionsContainer = document.getElementById(`options-${voteId}`);
    if (!optionsContainer) return;

    // 只更新選項的投票數和百分比
    Object.entries(voteData.options).forEach(([optionId, option]) => {
        const percentage = voteData.totalVotes > 0 ? (option.votes / voteData.totalVotes * 100).toFixed(1) : 0;
        
        // 更新投票數和百分比文字
        const voteCountSpan = optionsContainer.querySelector(`button[onclick="handleVote('${voteId}', '${optionId}')"] .text-sm`);
        if (voteCountSpan) {
            voteCountSpan.textContent = `${option.votes} 票 (${percentage}%)`;
        }

        // 更新進度條
        const progressBar = optionsContainer.querySelector(`button[onclick="handleVote('${voteId}', '${optionId}')"]`)
            .nextElementSibling.querySelector('.bg-gradient-to-r');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    });
}

// 更新點讚處理函數
async function handleLike(voteId) {
    try {
        const userIP = await getUserIP();
        if (!userIP) {
            throw new Error('無法獲取IP地址');
        }

        const voteRef = db.collection('votes').doc(voteId);
        const likeRef = db.collection('vote_likes').doc(`${voteId}_${userIP}`);
        const likeButton = document.querySelector(`button[onclick="handleLike('${voteId}')"]`);
        
        // 添加點擊動畫效果
        likeButton.classList.add('scale-110');
        setTimeout(() => {
            likeButton.classList.remove('scale-110');
        }, 200);

        // 檢查是否已經點讚
        const likeDoc = await likeRef.get();
        
        await db.runTransaction(async (transaction) => {
            const voteDoc = await transaction.get(voteRef);
            if (!voteDoc.exists) {
                throw new Error("投票不存在");
            }

            const voteData = voteDoc.data();
            const currentLikes = voteData.likes || 0;

            if (likeDoc.exists) {
                // 取消點讚
                transaction.update(voteRef, {
                    likes: currentLikes - 1
                });
                transaction.delete(likeRef);
                likeButton.classList.remove('liked');
            } else {
                // 添加點讚
                transaction.update(voteRef, {
                    likes: currentLikes + 1
                });
                transaction.set(likeRef, {
                    ip: userIP,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    voteId: voteId
                });
                likeButton.classList.add('liked');
            }

            // 更新點讚數
            const likesCount = likeButton.querySelector('.likes-count');
            if (likesCount) {
                likesCount.textContent = likeDoc.exists ? currentLikes - 1 : currentLikes + 1;
            }
        });

    } catch (error) {
        console.error("Error handling like:", error);
    }
}

// 頁面載入時檢查已點讚狀態
async function checkLikedStatus() {
    try {
        const userIP = await getUserIP();
        if (!userIP) return;

        const likeRefs = await db.collection('vote_likes')
            .where('ip', '==', userIP)
            .get();

        likeRefs.forEach(doc => {
            const [voteId] = doc.id.split('_');
            const likeButton = document.querySelector(`button[onclick="handleLike('${voteId}')"]`);
            if (likeButton) {
                likeButton.classList.add('liked');
            }
        });
    } catch (error) {
        console.error("Error checking liked status:", error);
    }
}

// 將 handleVote 函數添加到全局作用域
window.handleVote = handleVote;

// 將點讚函數添加到全局作用域
window.handleLike = handleLike;

// 添加導航欄控制邏輯
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navClose = document.getElementById('navClose');
    const mainNav = document.getElementById('mainNav');
    const navOverlay = document.getElementById('navOverlay');

    function openNav() {
        mainNav.classList.remove('hidden');
        mainNav.classList.add('show');
        navOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        mainNav.classList.remove('show');
        navOverlay.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (!mainNav.classList.contains('show')) {
                mainNav.classList.add('hidden');
            }
        }, 300);
    }

    mobileMenuBtn.addEventListener('click', openNav);
    navClose.addEventListener('click', closeNav);
    navOverlay.addEventListener('click', closeNav);

    // 監聽視窗大小變化
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            mainNav.classList.remove('hidden');
            navOverlay.classList.remove('show');
            document.body.style.overflow = '';
        } else if (!mainNav.classList.contains('show')) {
            mainNav.classList.add('hidden');
        }
    });
});

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', () => {
    loadVotes();
    checkLikedStatus();
});

// 添加申請投票相關函數
function openVoteRequestModal() {
    const modal = document.getElementById('voteRequestModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // 初始化兩個選項
    const container = document.getElementById('requestOptionsContainer');
    container.innerHTML = '';
    addRequestOption();
    addRequestOption();
}

function closeVoteRequestModal() {
    const modal = document.getElementById('voteRequestModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function addRequestOption() {
    const container = document.getElementById('requestOptionsContainer');
    const optionCount = container.getElementsByClassName('option-input').length;
    
    if (optionCount >= 4) {
        alert('最多只能添加4個選項');
        return;
    }

    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input flex items-center space-x-2 mt-2';
    optionDiv.innerHTML = `
        <input type="text" placeholder="選項 ${optionCount + 1}" required
            class="flex-grow rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
        ${optionCount > 1 ? `
            <button type="button" onclick="this.parentElement.remove()" 
                class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        ` : ''}
    `;
    
    container.appendChild(optionDiv);
}

async function submitVoteRequest() {
    const title = document.getElementById('requestTitle').value;
    const description = document.getElementById('requestDescription').value;
    const options = {};
    
    document.querySelectorAll('.option-input input').forEach((input, index) => {
        if (input.value.trim()) {
            options[`option${index + 1}`] = {
                text: input.value.trim(),
                votes: 0
            };
        }
    });

    if (Object.keys(options).length < 2) {
        alert('請至少添加兩個選項');
        return;
    }

    try {
        const userIP = await getUserIP();
        if (!userIP) throw new Error('無法獲取IP地址');

        await db.collection('vote_requests').add({
            title,
            description,
            options,
            requestedBy: userIP,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('申請已提交，等待管理員審核');
        closeVoteRequestModal();
    } catch (error) {
        console.error("Error submitting vote request:", error);
        alert('提交失敗，請稍後再試');
    }
}

// 將函數添加到全局作用域
window.openVoteRequestModal = openVoteRequestModal;
window.closeVoteRequestModal = closeVoteRequestModal;
window.addRequestOption = addRequestOption;
window.submitVoteRequest = submitVoteRequest; 