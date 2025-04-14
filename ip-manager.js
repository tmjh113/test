// IP 管理功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化頁籤切換功能
    initTabs();
    
    // 載入已封鎖的 IP 地址
    loadBlockedIps();
    
    // 綁定封鎖 IP 按鈕事件
    const blockIpBtn = document.getElementById('blockIpBtn');
    if (blockIpBtn) {
        blockIpBtn.addEventListener('click', blockNewIp);
    }
});

// 初始化頁籤切換功能
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有 active 狀態
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 設置當前 active 狀態
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 載入已封鎖的 IP 地址
async function loadBlockedIps() {
    const blockedIpsContainer = document.getElementById('blockedIpsContainer');
    if (!blockedIpsContainer) return;
    
    blockedIpsContainer.innerHTML = '<div class="loading">正在載入 IP 資訊...</div>';
    
    try {
        // 從 Firestore 獲取已封鎖的 IP 地址
        const snapshot = await db.collection('blockedIps').orderBy('blockedAt', 'desc').get();
        
        if (snapshot.empty) {
            blockedIpsContainer.innerHTML = '<div class="no-ips">目前沒有被封鎖的 IP 地址</div>';
            return;
        }
        
        blockedIpsContainer.innerHTML = '';
        
        // 遍歷並顯示每個封鎖的 IP
        snapshot.forEach(doc => {
            const ipData = doc.data();
            const ipElement = createIpElement(doc.id, ipData);
            blockedIpsContainer.appendChild(ipElement);
        });
        
    } catch (error) {
        console.error('載入封鎖 IP 時發生錯誤:', error);
        blockedIpsContainer.innerHTML = '<div class="error-message">載入封鎖 IP 失敗，請稍後再試</div>';
    }
}

// 創建 IP 地址元素
function createIpElement(docId, ipData) {
    const ipElement = document.createElement('div');
    ipElement.className = 'ip-card';
    ipElement.setAttribute('data-ip-id', docId);
    
    const timestamp = ipData.blockedAt?.toDate() || new Date();
    const formattedDate = timestamp.toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const postCount = ipData.postCount || 0;
    
    ipElement.innerHTML = `
        <div class="ip-header">
            <h3>🔒 封鎖 IP: ${ipData.ipAddress}</h3>
        </div>
        <div class="ip-content">
            <div><strong>使用此 IP 發布的文章數:</strong> ${postCount}</div>
            <div class="reason-badge">${ipData.reason || '違規行為'}</div>
            <div class="timestamp-badge">封鎖時間: ${formattedDate}</div>
        </div>
        <div class="ip-actions">
            <button class="unblock-btn" onclick="unblockIp('${docId}', '${ipData.ipAddress}')">解除封鎖</button>
            <button class="delete-posts-btn" onclick="deleteIpPosts('${ipData.ipAddress}')" ${postCount === 0 ? 'disabled' : ''}>刪除此 IP 所有文章</button>
        </div>
    `;
    
    return ipElement;
}

// 封鎖新的 IP 地址
async function blockNewIp() {
    const ipAddressInput = document.getElementById('ipAddress');
    const blockReasonInput = document.getElementById('blockReason');
    
    const ipAddress = ipAddressInput.value.trim();
    const reason = blockReasonInput.value.trim() || '違規行為';
    
    if (!ipAddress) {
        alert('請輸入要封鎖的 IP 地址');
        return;
    }
    
    // 基本的 IP 地址格式驗證
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipAddress)) {
        alert('請輸入有效的 IP 地址格式 (例如: 192.168.1.1)');
        return;
    }
    
    try {
        // 檢查此 IP 是否已被封鎖
        const existingIpDoc = await db.collection('blockedIps').where('ipAddress', '==', ipAddress).get();
        
        if (!existingIpDoc.empty) {
            alert('此 IP 地址已經被封鎖');
            return;
        }
        
        // 計算此 IP 發布的貼文數量
        const postsSnapshot = await db.collection('posts').where('ipAddress', '==', ipAddress).get();
        const repliesSnapshot = await db.collection('postsrea').where('ipAddress', '==', ipAddress).get();
        
        const postCount = postsSnapshot.size + repliesSnapshot.size;
        
        // 添加到已封鎖 IP 集合
        await db.collection('blockedIps').add({
            ipAddress: ipAddress,
            reason: reason,
            blockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            postCount: postCount
        });
        
        // 重置表單
        ipAddressInput.value = '';
        blockReasonInput.value = '';
        
        // 重新載入封鎖 IP 列表
        loadBlockedIps();
        
        alert(`已成功封鎖 IP 地址: ${ipAddress}`);
        
    } catch (error) {
        console.error('封鎖 IP 時發生錯誤:', error);
        alert('封鎖 IP 失敗，請稍後再試');
    }
}

// 解除封鎖 IP 地址
async function unblockIp(docId, ipAddress) {
    if (!confirm(`確定要解除封鎖 IP 地址: ${ipAddress} 嗎？`)) {
        return;
    }
    
    try {
        // 從 Firestore 中刪除該 IP 記錄
        await db.collection('blockedIps').doc(docId).delete();
        
        // 重新載入封鎖 IP 列表
        loadBlockedIps();
        
        alert(`已成功解除封鎖 IP 地址: ${ipAddress}`);
        
    } catch (error) {
        console.error('解除封鎖 IP 時發生錯誤:', error);
        alert('解除封鎖 IP 失敗，請稍後再試');
    }
}

// 修改 createPostElement 函數來顯示 IP 地址和添加封鎖功能
function enhancePostElement(originalFunction) {
    window.createPostElement = function(docId, postData, isReply) {
        // 調用原始函數
        const postElement = originalFunction(docId, postData, isReply);
        
        // 獲取 IP 地址
        const ipAddress = postData.ipAddress || '未記錄';
        
        // 創建 IP 資訊元素
        const ipInfo = document.createElement('div');
        ipInfo.className = 'ip-info';
        ipInfo.style.marginTop = '10px';
        ipInfo.style.fontSize = '0.9em';
        ipInfo.style.color = '#7f8c8d';
        ipInfo.innerHTML = `<strong>IP 地址:</strong> ${ipAddress}`;
        
        // 添加封鎖 IP 按鈕
        const blockButton = document.createElement('button');
        blockButton.className = 'block-btn';
        blockButton.style.marginLeft = '10px';
        blockButton.style.padding = '5px 10px';
        blockButton.style.fontSize = '0.85em';
        blockButton.textContent = '封鎖此 IP';
        blockButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            blockIpFromPost(ipAddress);
        };
        
        ipInfo.appendChild(blockButton);
        
        // 將 IP 資訊添加到貼文元素
        const contentElement = postElement.querySelector('.post-content');
        if (contentElement) {
            contentElement.parentNode.insertBefore(ipInfo, contentElement.nextSibling);
        }
        
        return postElement;
    };
}

// 從貼文中封鎖 IP 地址
async function blockIpFromPost(ipAddress) {
    // 填充表單並滾動到 IP 管理部分
    const ipAddressInput = document.getElementById('ipAddress');
    const blockReasonInput = document.getElementById('blockReason');
    const tabButton = document.querySelector('.tab-button[data-tab="ip-tab"]');
    
    if (ipAddressInput && tabButton) {
        ipAddressInput.value = ipAddress;
        blockReasonInput.value = '從貼文中封鎖';
        
        // 切換到 IP 管理頁籤
        tabButton.click();
        
        // 滾動到表單
        const ipForm = document.querySelector('.new-ip-form');
        if (ipForm) {
            ipForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// 刪除特定 IP 地址的所有文章
async function deleteIpPosts(ipAddress) {
    if (!confirm(`確定要刪除 IP 地址 ${ipAddress} 的所有文章嗎？此操作無法撤銷！`)) {
        return;
    }
    
    try {
        // 顯示加載指示器或禁用按鈕
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message';
        statusElement.textContent = `正在刪除 IP ${ipAddress} 的文章...`;
        document.body.appendChild(statusElement);
        
        // 獲取並刪除主貼文
        const postsSnapshot = await db.collection('posts').where('ipAddress', '==', ipAddress).get();
        let deletedCount = 0;
        
        const deletePromises = [];
        
        postsSnapshot.forEach(doc => {
            deletePromises.push(db.collection('posts').doc(doc.id).delete());
            deletedCount++;
        });
        
        // 獲取並刪除回覆
        const repliesSnapshot = await db.collection('postsrea').where('ipAddress', '==', ipAddress).get();
        
        repliesSnapshot.forEach(doc => {
            deletePromises.push(db.collection('postsrea').doc(doc.id).delete());
            deletedCount++;
        });
        
        // 等待所有刪除完成
        await Promise.all(deletePromises);
        
        // 更新封鎖的 IP 記錄中的文章計數
        const blockedIpSnapshot = await db.collection('blockedIps').where('ipAddress', '==', ipAddress).get();
        
        if (!blockedIpSnapshot.empty) {
            blockedIpSnapshot.forEach(async doc => {
                await db.collection('blockedIps').doc(doc.id).update({
                    postCount: 0
                });
            });
        }
        
        // 重新載入封鎖 IP 列表
        loadBlockedIps();
        
        // 移除狀態訊息
        document.body.removeChild(statusElement);
        
        // 顯示成功訊息
        alert(`已成功刪除 IP 地址 ${ipAddress} 的 ${deletedCount} 篇文章`);
        
    } catch (error) {
        console.error('刪除文章時發生錯誤:', error);
        alert('刪除文章失敗，請稍後再試');
        
        // 確保移除狀態訊息
        const statusElement = document.querySelector('.status-message');
        if (statusElement) {
            document.body.removeChild(statusElement);
        }
    }
}

// 在頁面載入後設置函數增強
document.addEventListener('DOMContentLoaded', function() {
    // 等待 2 秒確保原始函數已經載入
    setTimeout(function() {
        if (typeof window.createPostElement === 'function') {
            const originalCreatePostElement = window.createPostElement;
            enhancePostElement(originalCreatePostElement);
        }
    }, 2000);
}); 