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

// 添加選項輸入框
function addOptionInput() {
    const container = document.getElementById('optionsContainer');
    const optionCount = container.getElementsByClassName('option-input').length;
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input flex items-center space-x-2';
    optionDiv.innerHTML = `
        <input type="text" placeholder="選項 ${optionCount + 1}" 
               class="flex-grow px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
        <button type="button" onclick="this.parentElement.remove()" 
                class="text-red-500 hover:text-red-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;
    
    container.appendChild(optionDiv);
}

// 獲取所有選項
function getOptions() {
    const options = {};
    document.querySelectorAll('.option-input input').forEach((input, index) => {
        if (input.value.trim()) {
            options[`option${index + 1}`] = {
                text: input.value.trim(),
                votes: 0
            };
        }
    });
    return options;
}

// 處理新增投票
async function handleNewVote(event) {
    event.preventDefault();
    
    const voteData = {
        title: document.getElementById('voteTitle').value,
        description: document.getElementById('voteDescription').value,
        options: getOptions(),
        endTime: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('endTime').value)),
        createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
        totalVotes: 0
    };

    try {
        await db.collection('votes').add(voteData);
        showNotification('投票創建成功！', 'success');
        loadVoteManagement();
        event.target.reset();
        document.getElementById('optionsContainer').innerHTML = '';
    } catch (error) {
        console.error("Error creating vote:", error);
        showNotification('創建失敗，請稍後再試', 'error');
    }
}

// 載入投票管理列表
async function loadVoteManagement() {
    try {
        const querySnapshot = await db.collection('votes').orderBy('createdAt', 'desc').get();
        const container = document.getElementById('voteManagementList');
        container.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const voteData = doc.data();
            const card = createManagementCard(doc.id, voteData);
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading votes:", error);
    }
}

// 創建管理卡片
function createManagementCard(voteId, voteData) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-xl p-6';
    
    const endTime = voteData.endTime.toDate();
    const isExpired = endTime < new Date();
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-800">${voteData.title}</h3>
            <span class="px-4 py-1 rounded-full text-sm font-semibold ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                ${isExpired ? '已結束' : '進行中'}
            </span>
        </div>
        <p class="text-gray-600 mb-4">${voteData.description}</p>
        <div class="text-sm text-gray-500">
            結束時間: ${endTime.toLocaleString()}
        </div>
        <div class="text-sm text-gray-500 mb-4">
            總投票數: ${voteData.totalVotes}
        </div>
        <div class="space-y-2">
            ${Object.entries(voteData.options).map(([key, option]) => `
                <div class="flex justify-between items-center">
                    <span class="text-gray-700">${option.text}</span>
                    <span class="text-indigo-600 font-medium">${option.votes} 票</span>
                </div>
            `).join('')}
        </div>
        <div class="mt-4 flex justify-end">
            <button onclick="deleteVote('${voteId}')" class="px-4 py-2 rounded-xl text-white font-semibold bg-red-500 hover:bg-red-600 transform transition-all hover:scale-105">
                刪除投票
            </button>
        </div>
    `;
    
    return card;
}

// 刪除投票
async function deleteVote(voteId) {
    if (!confirm('確定要刪除這個投票嗎？')) return;
    
    try {
        await db.collection('votes').doc(voteId).delete();
        showNotification('刪除成功！', 'success');
        loadVoteManagement();
    } catch (error) {
        console.error("Error deleting vote:", error);
        showNotification('刪除失敗，請稍後再試', 'error');
    }
}

// 添加載入投票申請列表的函數
async function loadVoteRequests() {
    try {
        const querySnapshot = await db.collection('vote_requests')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();

        const container = document.getElementById('voteRequestsList');
        container.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const requestData = doc.data();
            const card = createRequestCard(doc.id, requestData);
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading vote requests:", error);
    }
}

function createRequestCard(requestId, requestData) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-xl p-6 mb-4';
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-800">${requestData.title}</h3>
            <span class="px-4 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                待審核
            </span>
        </div>
        <p class="text-gray-600 mb-4">${requestData.description}</p>
        <div class="space-y-2 mb-4">
            ${Object.entries(requestData.options).map(([key, option]) => `
                <div class="text-gray-700">${option.text}</div>
            `).join('')}
        </div>
        <div class="flex justify-end space-x-4">
            <button onclick="approveVoteRequest('${requestId}')"
                class="px-4 py-2 rounded-xl text-white font-semibold bg-green-500 hover:bg-green-600 transition-all">
                批准
            </button>
            <button onclick="rejectVoteRequest('${requestId}')"
                class="px-4 py-2 rounded-xl text-white font-semibold bg-red-500 hover:bg-red-600 transition-all">
                拒絕
            </button>
        </div>
    `;
    
    return card;
}

async function approveVoteRequest(requestId) {
    try {
        const requestDoc = await db.collection('vote_requests').doc(requestId).get();
        const requestData = requestDoc.data();

        // 創建新投票，設置24小時後結束
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 24);

        await db.collection('votes').add({
            title: requestData.title,
            description: requestData.description,
            options: requestData.options,
            endTime: firebase.firestore.Timestamp.fromDate(endTime),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalVotes: 0
        });

        // 更新申請狀態
        await db.collection('vote_requests').doc(requestId).update({
            status: 'approved'
        });

        showNotification('投票已批准並創建！', 'success');
        loadVoteRequests();
        loadVoteManagement();
    } catch (error) {
        console.error("Error approving vote request:", error);
        showNotification('操作失敗，請稍後再試', 'error');
    }
}

async function rejectVoteRequest(requestId) {
    try {
        await db.collection('vote_requests').doc(requestId).update({
            status: 'rejected'
        });
        showNotification('已拒絕該投票申請', 'success');
        loadVoteRequests();
    } catch (error) {
        console.error("Error rejecting vote request:", error);
        showNotification('操作失敗，請稍後再試', 'error');
    }
}

// 顯示通知
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-xl shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.innerText = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 將函數添加到全局作用域
window.addOptionInput = addOptionInput;
window.deleteVote = deleteVote;
window.approveVoteRequest = approveVoteRequest;
window.rejectVoteRequest = rejectVoteRequest;

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newVoteForm');
    form.addEventListener('submit', handleNewVote);
    
    const addOptionBtn = document.getElementById('addOption');
    addOptionBtn.addEventListener('click', addOptionInput);
    
    loadVoteManagement();
    loadVoteRequests();
}); 