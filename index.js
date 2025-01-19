
    // Firebase 配置
    const firebaseConfig = {
        apiKey: "AIzaSyDAw3LKSDH HwasOhN0l63lO4I-AO1xeGGU",
        authDomain: "tmjh113.firebaseapp.com",
        projectId: "tmjh113",
        storageBucket: "tmjh113.appspot.com",
        messagingSenderId: "936878916477",
        appId: "1:936878916477:web:cbff479db9898b0a218214",
        measurementId: "G-J5WT01ZLBD"
    };

    // 初始化 Firebase
    firebase.initializeApp(firebaseConfig);

    // 獲取 Firestore 和 Storage 實例
    const db = firebase.firestore();
    const storage = firebase.storage();

    // 確保所有 DOM 元素都存在後再使用
    document.addEventListener('DOMContentLoaded', () => {
        const postContent = document.getElementById('postContent');
        const charCount = document.getElementById('charCount');
        const submitButton = document.getElementById('submitButton');
        const postMedia = document.getElementById('postMedia');
        const mediaPreview = document.getElementById('mediaPreview');
        const postCountDisplay = document.getElementById('postCountDisplay').querySelector('.text-4xl');
        const approvedCountDisplay = document.getElementById('approvedCountDisplay').querySelector('.text-4xl');
        const pendingCountDisplay = document.getElementById('pendingCountDisplay').querySelector('.text-4xl');
        const giphyButton = document.getElementById('giphyButton');
        const giphyModal = document.getElementById('giphyModal');
        const giphySearch = document.getElementById('giphySearch');
        const giphyResults = document.getElementById('giphyResults');
        const closeModal = document.getElementsByClassName('close')[0];

        let minChars = 3;
        let selectedGifs = [];

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

        postMedia.addEventListener('change', function(e) {
            handleMediaFiles(e.target.files);
        });

        function handleMediaFiles(files) {
            const totalFiles = mediaPreview.children.length + files.length;
            if (totalFiles > 2) {
                alert('最多只能上傳兩個檔案');
                return;
            }

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const mediaElement = document.createElement(file.type.startsWith('video') ? 'video' : 'img');
                    mediaElement.src = e.target.result;
                    mediaElement.classList.add('h-28', 'w-28', 'object-cover', 'rounded-xl', 'shadow-lg', 'transition-transform', 'duration-300', 'hover:scale-110');
                    if (file.type.startsWith('video')) {
                        mediaElement.controls = true;
                    }
                    const deleteButton = createDeleteButton();
                    const container = document.createElement('div');
                    container.classList.add('relative');
                    container.appendChild(mediaElement);
                    container.appendChild(deleteButton);
                    mediaPreview.appendChild(container);
                }
                reader.readAsDataURL(file);
            });
        }

        function createDeleteButton() {
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '&times;';
            deleteButton.classList.add('absolute', 'top-0', 'right-0', 'bg-red-500', 'text-white', 'rounded-full', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'cursor-pointer', 'hover:bg-red-600', 'transition-colors', 'text-xl', 'font-bold', 'shadow-lg');
            deleteButton.addEventListener('click', function(e) {
                e.preventDefault();
                this.parentElement.remove();
                selectedGifs = selectedGifs.filter(gif => gif.element !== this.parentElement);
            });
            return deleteButton;
        }

        giphyButton.addEventListener('click', () => {
            giphyModal.style.display = 'block';
            fetchTrendingGifs();
        });

        closeModal.addEventListener('click', () => {
            giphyModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == giphyModal) {
                giphyModal.style.display = 'none';
            }
        });

        const GIPHY_API_KEY = 'IDkUxoLQeEr4a7cPv8bm6PByLeWI1TTs';

        giphySearch.addEventListener('input', debounce(() => {
            const query = giphySearch.value.trim();
            if (query) {
                searchGiphy(query);
            } else {
                fetchTrendingGifs();
            }
        }, 300));

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        function searchGiphy(query) {
            fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20`)
                .then(response => response.json())
                .then(data => displayGiphyResults(data.data));
        }

        function fetchTrendingGifs() {
            fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`)
                .then(response => response.json())
                .then(data => displayGiphyResults(data.data));
        }

        function displayGiphyResults(gifs) {
            giphyResults.innerHTML = '';
            gifs.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.images.fixed_height.url;
                img.alt = gif.title;
                img.addEventListener('click', () => selectGif(gif));
                giphyResults.appendChild(img);
            });
        }

        function selectGif(gif) {
            if (mediaPreview.children.length >= 2) {
                alert('最多只能選擇兩個媒體檔案（圖片或 GIF）');
                return;
            }

            const img = document.createElement('img');
            img.src = gif.images.fixed_height.url;
            img.alt = gif.title;
            img.classList.add('h-28', 'w-28', 'object-cover', 'rounded-xl', 'shadow-lg', 'transition-transform', 'duration-300', 'hover:scale-110');
            const deleteButton = createDeleteButton();
            const container = document.createElement('div');
            container.classList.add('relative');
            container.appendChild(img);
            container.appendChild(deleteButton);
            mediaPreview.appendChild(container);
            selectedGifs.push({gif: gif, element: container});
            giphyModal.style.display = 'none';
        }

        // 修改 updatePostCount 函數
        function updatePostCount() {
            // 使用一次查詢獲取所有需要的數據
            db.collection('posts')
                .get()
                .then((snapshot) => {
                    const stats = snapshot.docs.reduce((acc, doc) => {
                        acc.total++;
                        doc.data().approved ? acc.approved++ : acc.pending++;
                        return acc;
                    }, { total: 0, approved: 0, pending: 0 });

                    postCountDisplay.textContent = stats.total;
                    approvedCountDisplay.textContent = stats.approved;
                    pendingCountDisplay.textContent = stats.pending;
                });
        }

        // 頁面加載時更新帖子數量
        updatePostCount();

        // 在表單提交事件處理中添加防止重複提交的邏輯
        let isSubmitting = false;

        document.getElementById('postForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 防止重複提交
            if (isSubmitting) return;
            isSubmitting = true;
            
            const content = postContent.value;
            const mediaFiles = postMedia.files;
            
            if (content.trim().length < minChars && mediaFiles.length === 0 && selectedGifs.length === 0) {
                alert(`請輸入至少${minChars}字的內容或選擇圖片/GIF`);
                isSubmitting = false;
                return;
            }
            
            // 顯示加載動畫
            submitButton.innerHTML = '<div class="spinner mx-auto"></div>';
            submitButton.disabled = true;
            
            try {
                console.log("開始處理單提交");

                // 獲取 IP 地址
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                const ipAddress = ipData.ip;

                // 上傳媒體檔案到 Firebase Storage
                const mediaUrls = [];
                for (let i = 0; i < mediaFiles.length; i++) {
                    const file = mediaFiles[i];
                    const storageRef = storage.ref('media/' + Date.now() + '_' + file.name);
                    await storageRef.put(file);
                    const url = await storageRef.getDownloadURL();
                    mediaUrls.push({url: url, type: file.type.startsWith('video') ? 'video' : 'image'});
                }

                // 添加選擇的 GIF 並上傳到 Firebase Storage
                for (let i = 0; i < selectedGifs.length; i++) {
                    const gif = selectedGifs[i].gif;
                    const response = await fetch(gif.images.original.url);
                    const blob = await response.blob();
                    const storageRef = storage.ref('gifs/' + Date.now() + '_' + gif.id + '.gif');
                    await storageRef.put(blob);
                    const url = await storageRef.getDownloadURL();
                    mediaUrls.push({url: url, type: 'gif'});
                }

                // 修改用戶查詢邏輯
                const CACHE_KEY = 'usersList';
                const CACHE_TIME = 5 * 60 * 1000; // 5分鐘
                
                let users;
                const cachedData = sessionStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const { data, timestamp } = JSON.parse(cachedData);
                    if (Date.now() - timestamp < CACHE_TIME) {
                        users = data;
                    }
                }

                if (!users) {
                    const usersSnapshot = await db.collection('users').get();
                    users = usersSnapshot.docs.map(doc => doc.id);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                        data: users,
                        timestamp: Date.now()
                    }));
                }

                const assignedUser = users[Math.floor(Math.random() * users.length)];

                // 使用批量寫入來減少數據庫操作
                const batch = db.batch();
                
                // 創建新帖子
                const postRef = db.collection('posts').doc();
                batch.set(postRef, {
                    content: content,
                    mediaUrls: mediaUrls,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ipAddress: ipAddress,
                    assignedUser: assignedUser
                });

                // 更新 tmjh 集合
                const tmjhRef = db.collection('tmjh').doc(assignedUser);
                batch.set(tmjhRef, {
                    posts: firebase.firestore.FieldValue.arrayUnion(postRef.id)
                }, { merge: true });

                // 執行批量寫入
                await batch.commit();

                // 更新帖子數量
                updatePostCount();

                // 顯示成功消息
                submitButton.innerHTML = `
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                `;
                submitButton.classList.add('bg-green-500');
                submitButton.classList.remove('bg-gradient-to-r', 'from-indigo-500', 'to-pink-500');
                
                // 顯示審核消息
                const message = document.createElement('div');
                message.className = 'mt-4 p-3 bg-indigo-100 text-indigo-700 rounded-lg text-center fade-in font-medium';
                message.textContent = '天中乾淨正在審核您的貼文，請稍後';
                this.insertAdjacentElement('afterend', message);
                
                // 重置表單
                setTimeout(() => {
                    this.reset();
                    charCount.textContent = '已輸入 0 字';
                    charCount.classList.remove('text-red-500');
                    submitButton.innerHTML = '發布';
                    submitButton.disabled = false;
                    submitButton.classList.remove('bg-green-500');
                    submitButton.classList.add('bg-gradient-to-r', 'from-indigo-500', 'to-pink-500');
                    message.remove();
                    mediaPreview.innerHTML = '';
                    selectedGifs = [];
                }, 3000);
            } catch (error) {
                console.error("發布帖子時出錯: ", error);
                alert('發布失敗，請稍後再試。');
                submitButton.innerHTML = '發布';
                submitButton.disabled = false;
            } finally {
                isSubmitting = false;
            }
        });

        // 移動端選單控制
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const nav = document.querySelector('nav');

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

        // 更新當前頁面的活動狀態
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPath.split('/').pop()) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 添加到 DOMContentLoaded 事件處理程序內
        const toggleNav = document.getElementById('toggleNav');
        const sideNav = document.getElementById('sideNav');
        const mainContent = document.querySelector('main');

        // 從 localStorage 讀取導航欄狀態
        const isNavCollapsed = localStorage.getItem('navCollapsed') === 'true';
        if (isNavCollapsed) {
            sideNav.classList.add('nav-collapsed');
            mainContent.classList.add('nav-collapsed-margin');
        }

        toggleNav.addEventListener('click', () => {
            sideNav.classList.toggle('nav-collapsed');
            mainContent.classList.toggle('nav-collapsed-margin');
            
            // 保存導航欄狀態到 localStorage
            localStorage.setItem('navCollapsed', sideNav.classList.contains('nav-collapsed'));
        });

        // 添加工具提示功能
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const title = link.getAttribute('title');
            if (title) {
                link.addEventListener('mouseenter', (e) => {
                    if (sideNav.classList.contains('nav-collapsed')) {
                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = title;
                        tooltip.style.cssText = `
                            position: fixed;
                            background: rgba(0, 0, 0, 0.8);
                            color: white;
                            padding: 5px 10px;
                            border-radius: 5px;
                            font-size: 14px;
                            z-index: 1000;
                            pointer-events: none;
                            transition: opacity 0.2s;
                        `;
                        document.body.appendChild(tooltip);
                        
                        const rect = link.getBoundingClientRect();
                        tooltip.style.left = rect.right + 10 + 'px';
                        tooltip.style.top = rect.top + (rect.height - tooltip.offsetHeight) / 2 + 'px';
                        
                        link.addEventListener('mouseleave', () => tooltip.remove());
                    }
                });
            }
        });
    });