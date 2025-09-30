// These are now initialized in DOMContentLoaded

// Authentication state
let isAuthenticated = false;
const correctPassword = "10A2K26"; // TODO: Move to environment variable for production

// Rate limiting for uploads
let lastUploadTime = 0;
const UPLOAD_COOLDOWN = 5000; // 5 seconds between uploads

// Input sanitization function
function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

// XSS protection for user inputs
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Check if user can upload (rate limiting)
function canUpload() {
    const now = Date.now();
    if (now - lastUploadTime < UPLOAD_COOLDOWN) {
        const remainingTime = Math.ceil((UPLOAD_COOLDOWN - (now - lastUploadTime)) / 1000);
        showErrorToast(`Vui lòng đợi ${remainingTime} giây trước khi upload tiếp!`);
        return false;
    }
    return true;
}

// Image lazy loading with intersection observer
function setupLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('fade-in');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

// Check authentication from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS and Feather Icons first
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });
    feather.replace();
    
    const authStatus = localStorage.getItem('isAuthenticated');
    isAuthenticated = authStatus === 'true';
    
    if (isAuthenticated) {
        showMemoryActions();
        updateUploadButtonUI();
    }
    
    // Setup lazy loading
    setupLazyLoading();
    
    // Load memories after DOM is ready
    setTimeout(() => {
        loadMemories();
    }, 100);
});

// Load memories from server
async function loadMemories() {
    try {
        showLoadingState(true);
        const resp = await fetch(`/.netlify/functions/get-memories?page=${currentPage}&limit=20`);
        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${resp.status}: Failed to load memories`);
        }

        const responseData = await resp.json();
        const { data: memories, total, totalPages } = responseData || {};
        
        // Validate response data
        if (!Array.isArray(memories)) {
            throw new Error('Invalid response format from server');
        }

        const grid = document.querySelector('.memory-grid');
        grid.innerHTML = '';

        if (memories.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i data-feather="image" class="w-16 h-16 mx-auto text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Chưa có ảnh kỷ niệm</h3>
                    <p class="text-gray-500">Hãy upload ảnh đầu tiên để bắt đầu!</p>
                </div>
            `;
            feather.replace();
            return;
        }

        memories.forEach(mem => {
            const memoryCard = document.createElement('div');
            memoryCard.className = 'memory-card';
            memoryCard.dataset.path = mem.path;
            memoryCard.innerHTML = `
                <img src="${mem.url}" alt="${mem.title}" class="memory-img" loading="lazy">
                <div class="memory-overlay">
                    <h3 class="memory-title">${mem.title}</h3>
                    <p class="memory-date">${new Date(mem.date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="memory-actions" style="display: ${isAuthenticated ? 'flex' : 'none'};">
                    <div class="memory-action-btn edit-btn"><i data-feather="edit"></i></div>
                    <div class="memory-action-btn delete-btn"><i data-feather="trash-2"></i></div>
                </div>
            `;
            grid.appendChild(memoryCard);
        });

        feather.replace();
        filterAndSortMemories();
        renderPagination(totalPages);

    } catch (err) {
        console.error('Load memories error:', err);
        
        // Show fallback content for network errors
        const grid = document.querySelector('.memory-grid');
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-feather="wifi-off" class="w-16 h-16 mx-auto text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Không thể tải kỷ niệm</h3>
                <p class="text-gray-500 mb-4">Vui lòng kiểm tra kết nối mạng và thử lại.</p>
                <button onclick="loadMemories()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                    Thử lại
                </button>
            </div>
        `;
        feather.replace();
        showErrorToast("Lỗi tải kỷ niệm: " + err.message);
    } finally {
        showLoadingState(false);
    }
}

function updateUploadButtonUI() {
    const uploadBtn = document.getElementById('uploadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileUploadBtn = document.getElementById('mobileUploadBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (isAuthenticated) {
        // Desktop
        uploadBtn.onclick = openUploadModal;
        uploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        logoutBtn.classList.remove('hidden');

        // Mobile
        mobileUploadBtn.onclick = openUploadModal;
        mobileUploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        mobileLogoutBtn.classList.remove('hidden');
    } else {
        // Desktop
        uploadBtn.onclick = openPasswordModal;
        uploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Nhập mật khẩu';
        logoutBtn.classList.add('hidden');

        // Mobile
        mobileUploadBtn.onclick = openPasswordModal;
        mobileUploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Nhập mật khẩu';
        mobileLogoutBtn.classList.add('hidden');
    }
    feather.replace();
}

function openPasswordModal() {
    if (isAuthenticated) {
        openUploadModal();
    } else {
        document.getElementById('passwordModal').classList.remove('hidden');
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('passwordError').classList.add('hidden');
    document.getElementById('passwordInput').value = '';
}

function checkPassword() {
    const enteredPassword = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('passwordError');
    
    if (enteredPassword === correctPassword) {
        isAuthenticated = true;
        localStorage.setItem('isAuthenticated', 'true');
        closePasswordModal();
        openUploadModal();
        showMemoryActions();
        updateUploadButtonUI();
        loadMemories(); // Reload to show actions
        showSuccessToast("Đăng nhập thành công!");
    } else {
        errorElement.textContent = "Mật khẩu không đúng. Vui lòng thử lại.";
        errorElement.classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Upload modal functions
function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileName').classList.add('hidden');
}

// File input display + validate size
document.getElementById('imageFile').addEventListener('change', function(e) {
    const fileNameElement = document.getElementById('fileName');
    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("⚠️ Ảnh vượt quá 5MB. Vui lòng chọn file nhỏ hơn.");
            this.value = ""; // reset input
            fileNameElement.classList.add('hidden');
            return;
        }
        fileNameElement.textContent = file.name + ` (${(file.size/1024/1024).toFixed(2)} MB)`;
        fileNameElement.classList.remove('hidden');
    } else {
        fileNameElement.classList.add('hidden');
    }
});

// ================== UPLOAD IMAGE ==================
function uploadImage() {
    // Rate limiting check
    if (!canUpload()) {
        return;
    }

    const title = sanitizeInput(document.getElementById('imageTitle').value);
    const date = document.getElementById('imageDate').value;
    const file = document.getElementById('imageFile').files[0];

    // Enhanced validation
    if (!title || title.length < 3) {
        showErrorToast('Tiêu đề phải có ít nhất 3 ký tự!');
        return;
    }

    if (!date) {
        showErrorToast('Vui lòng chọn ngày chụp!');
        return;
    }

    if (!file) {
        showErrorToast('Vui lòng chọn ảnh!');
        return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showErrorToast('Chỉ chấp nhận file JPG, PNG, WebP!');
        return;
    }

    // File size validation (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorToast('Kích thước file không được vượt quá 5MB!');
        return;
    }

    // Show loading state with progress bar
    const uploadBtn = document.querySelector('#uploadForm button[type="button"]');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Đang upload...';
    uploadBtn.disabled = true;
    uploadProgress.classList.remove('hidden');
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
        progressText.textContent = `Đang upload... ${Math.round(progress)}%`;
    }, 200);

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];

        try {
            const resp = await fetch('/.netlify/functions/upload-image', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    date,
                    filename: file.name,
                    contentBase64: base64,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Upload lỗi");

            // ✅ Thêm ảnh mới vào web ngay mà không cần reload
            const newMemory = document.createElement('div');
            newMemory.className = 'memory-card';
            newMemory.dataset.path = data.path;
            newMemory.innerHTML = `
                <img src="${data.url}" alt="${title}" class="memory-img">
                <div class="memory-overlay">
                    <h3 class="memory-title">${title}</h3>
                    <p class="memory-date">${new Date(date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="memory-actions" style="display: ${isAuthenticated ? 'flex' : 'none'};">
                    <div class="memory-action-btn edit-btn"><i data-feather="edit"></i></div>
                    <div class="memory-action-btn delete-btn"><i data-feather="trash-2"></i></div>
                </div>
            `;
            document.querySelector('.memory-grid').prepend(newMemory);

            // Update rate limiting
            lastUploadTime = Date.now();
            
            closeUploadModal();
            showSuccessToast("Thêm ảnh thành công!");
            feather.replace();
            filterAndSortMemories();
        } catch (err) {
            showErrorToast("Lỗi upload: " + err.message);
        } finally {
            // Complete progress and reset UI
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Hoàn thành!';
            
            setTimeout(() => {
                uploadBtn.innerHTML = originalText;
                uploadBtn.disabled = false;
                uploadProgress.classList.add('hidden');
                progressBar.style.width = '0%';
            }, 1000);
        }
    };

    reader.readAsDataURL(file);
}

// Utility functions for better UX
function showLoadingState(show) {
    const grid = document.querySelector('.memory-grid');
    const skeleton = document.getElementById('memorySkeleton');
    
    if (show) {
        // Show skeleton loading
        skeleton.classList.remove('hidden');
        grid.innerHTML = '';
        grid.appendChild(skeleton);
    } else {
        // Hide skeleton
        skeleton.classList.add('hidden');
    }
}

function showSuccessToast(message = "Upload ảnh thành công!") {
    const toast = document.getElementById('successToast');
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showErrorToast(message) {
    // Create error toast if not exists
    let errorToast = document.getElementById('errorToast');
    if (!errorToast) {
        errorToast = document.createElement('div');
        errorToast.id = 'errorToast';
        errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center hidden z-50';
        errorToast.innerHTML = '<i data-feather="alert-circle" class="mr-2"></i><span></span>';
        document.body.appendChild(errorToast);
    }
    
    errorToast.querySelector('span').textContent = message;
    errorToast.classList.remove('hidden');
    feather.replace();
    setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 4000);
}

function showMemoryActions() {
    const memoryActions = document.querySelectorAll('.memory-actions');
    memoryActions.forEach(actions => {
        if (actions) {
            actions.style.display = isAuthenticated ? 'flex' : 'none';
        }
    });
    
    // Also update edit/delete buttons in existing memories
    document.querySelectorAll('.edit-memory-btn, .delete-memory-btn').forEach(btn => {
        btn.style.display = isAuthenticated ? 'flex' : 'none';
    });
}

// Logout function
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    showMemoryActions();
    updateUploadButtonUI();
    loadMemories(); // Reload to hide actions
    showSuccessToast("Đã đăng xuất!");
    closeUploadModal();
}

// Delete memory function
async function deleteMemory(path) {
    if (!isAuthenticated) {
        showSuccessToast("Vui lòng đăng nhập để thực hiện!");
        openPasswordModal();
        return;
    }

    if (confirm("Bạn có chắc chắn muốn xóa ảnh này?")) {
        try {
            const resp = await fetch('/.netlify/functions/delete-image', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Xóa lỗi");

            // Remove from DOM
            const memoryItem = document.querySelector(`.memory-card[data-path="${path}"]`);
            if (memoryItem) {
                memoryItem.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    memoryItem.remove();
                    showSuccessToast("Đã xóa ảnh thành công!");
                    showPage(currentPage);
                }, 300);
            }
        } catch (err) {
            alert("❌ Có lỗi khi xóa: " + err.message);
        }
    }
}

// Edit memory function
function editMemory(path) {
    if (!isAuthenticated) {
        showSuccessToast("Vui lòng đăng nhập để thực hiện!");
        openPasswordModal();
        return;
    }

    const memoryItem = document.querySelector(`.memory-card[data-path="${path}"]`);
    if (memoryItem) {
        const title = memoryItem.querySelector('.memory-title').textContent;
        const date = memoryItem.querySelector('.memory-date').textContent;
        
        document.getElementById('imageTitle').value = title;
        document.getElementById('imageDate').value = new Date(date).toISOString().split('T')[0];
        document.getElementById('uploadForm').dataset.editing = path;
        
        openUploadModal();
    }
}

// Initialize memory actions
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        deleteMemory(memoryItem.dataset.path);
    }
    
    if (e.target.closest('.edit-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        editMemory(memoryItem.dataset.path);
    }
    
    // Gán sự kiện click cho tất cả ảnh trong memory-card
    const img = e.target.closest('.memory-img');
    if (img) {
        openImageModal(img.src);
    }
    
    // Gán sự kiện click cho mỗi student-card
    const card = e.target.closest('.student-card');
    if (card) {
        const name = card.querySelector('h3').textContent;
        const img = card.querySelector('img').src;
        const roleBadges = Array.from(card.querySelectorAll('.role-badge'))
                                .map(b => b.textContent)
                                .join(', ');
        openStudentModal(name, img, roleBadges);
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.id === 'passwordModal') {
        closePasswordModal();
    }
    if (event.target.id === 'uploadModal') {
        closeUploadModal();
    }
    if (event.target.id === 'imageModal') {
        closeImageModal();
    }
    if (event.target.id === 'studentModal') {
        closeStudentModal();
    }
}

// Mobile menu toggle with improved UX
const mobileMenuBtn = document.querySelector('.mobile-menu-button');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
            // Show menu
            mobileMenu.classList.remove('hidden');
            setTimeout(() => {
                mobileMenu.classList.remove('-translate-y-5', 'opacity-0');
            }, 10);
        } else {
            // Hide menu
            mobileMenu.classList.add('-translate-y-5', 'opacity-0');
            setTimeout(() => {
                mobileMenu.classList.add('hidden');
            }, 300);
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('-translate-y-5', 'opacity-0');
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                }, 300);
            }
        }
    });
}

// Scroll to Top (hiệu ứng mượt)
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Counter animation nâng cấp: chỉ chạy khi hiện trên màn hình
function animateCounter(counter) {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const startTime = performance.now();
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        counter.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
function checkCounters() {
    document.querySelectorAll('.counter').forEach(counter => {
        const rect = counter.getBoundingClientRect();
        if(rect.top < window.innerHeight && rect.bottom > 0 && counter.textContent === '0') {
            animateCounter(counter);
        }
    });
}
window.addEventListener('scroll', checkCounters);
window.addEventListener('load', checkCounters);

// Student list generator
const studentContainer = document.getElementById('student-container');

// Danh sách học sinh (role là mảng)
const students = [
    { name: 'Hoàng Quốc Vương', role: ['member'], img: 'img/vuong.jpg' },
    { name: 'Nguyễn Duy Anh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thanh Chúc', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Mạnh Cường', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thanh Thùy Dung', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Trần Đăng Dũng', role: ['member'], img: 'img/dung.jpg' },
    { name: 'Trần Quang Định', role: ['member'], img: 'img/quangdinh.jpg' },
    { name: 'Phạm Minh Đức', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Đỗ Trường Giang', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thu Hà', role: ['secretary'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Khắc Hiếu', role: ['member'], img: 'img/hieu.jpg' },
    { name: 'Vi Sĩ Hoan', role: ['member'], img: 'img/vihoan.jpg' },
    { name: 'Vũ Kim Huệ', role: ['member'], img: 'img/hue.jpg' },
    { name: 'Nguyễn Văn Huy', role: ['member'], img: 'img/huy.jpg' },
    { name: 'Nguyễn Phú Hưng', role: ['member'], img: 'img/phuhung.jpg' },
    { name: 'Nguyễn Xuân Hưng', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Trần Vân Khánh', role: ['member'], img: 'img/vankhanh.jpg' },
    { name: 'Lê Trung Kiên', role: ['member'], img: 'img/ADMIN.jpg' },
    { name: 'Nguyễn Trung Kiên', role: ['member'], img: 'img/nguyenkien.jpg' },
    { name: 'Nguyễn Bảo Lâm', role: ['member'], img: 'img/lam.jpg' },
    { name: 'Nguyễn Thu Lê', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Lê Thị Ngọc Linh', role: ['member'], img: 'img/ngoclinh.jpg' },
    { name: 'Nguyễn Hà Nhật Linh', role: ['member'], img: 'img/nhatlinh.jpg' },
    { name: 'Nguyễn Hoàng Linh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Phạm Bảo Nhật Linh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Đức Lĩnh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Bùi Khánh Ly', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Kiều Ngọc Mai', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Xuân Mai', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Hoàng Minh', role: ['monitor'], img: 'img/minh.jpg' },
    { name: 'Ngô Nguyên Hải Nam', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thành Nam', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Vũ Bảo Ngọc', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Khánh Hưng', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Phạm Công Sơn', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thanh Thảo', role: ['member'], img: 'img/thanhthao.jpg' },
    { name: 'Nguyễn Thị Thân Thương', role: ['member'], img: 'img/thuong.jpg' },
    { name: 'Hoàng Mạnh Tiến', role: ['member'], img: 'img/tien.jpg' },
    { name: 'Nguyễn Thu Trang', role: ['member'], img: 'img/trang.jpg' },
    { name: 'Nguyễn Thanh Tuyền', role: ['member'], img: 'img/tuyen.jpg' },
    { name: 'Đỗ Thy', role: ['member'], img: 'img/thy.jpg' },
    { name: 'Lưu Phương Vy', role: ['member'], img: 'img/phuongvy.jpg' },
    { name: 'Phạm Hà Vy', role: ['member'], img: 'img/hoangquocvuong.jpg' }
];

// Sắp xếp students theo thứ tự role
const roleOrder = {
    'monitor': 1,
    'studying': 2, 
    'deputy-labor': 3,
    'assistant-arts': 4,
    'secretary': 5,
    'group-leader': 6,
    'member': 7
};

// Sắp xếp students theo role priority
const sortedStudents = students.sort((a, b) => {
    const aRole = a.role[0]; // Lấy role đầu tiên
    const bRole = b.role[0];
    const aOrder = roleOrder[aRole] || 999;
    const bOrder = roleOrder[bRole] || 999;
    
    if (aOrder !== bOrder) {
        return aOrder - bOrder;
    }
    
    // Nếu cùng role, sắp xếp theo tên
    return a.name.localeCompare(b.name, 'vi');
});

// Function để render students với thứ tự đã sắp xếp
function renderStudents(studentsToRender = sortedStudents) {
    const studentContainer = document.getElementById('student-container');
    studentContainer.innerHTML = ''; // Clear existing content
    
    // Progressive loading - render in batches
    const batchSize = 8;
    let currentIndex = 0;
    
    function renderBatch() {
        const batch = studentsToRender.slice(currentIndex, currentIndex + batchSize);
        
        batch.forEach((student, index) => {
            setTimeout(() => {
                renderStudentCard(student, studentContainer);
            }, index * 50); // Stagger animation
        });
        
        currentIndex += batchSize;
        
        if (currentIndex < studentsToRender.length) {
            requestAnimationFrame(renderBatch);
        }
    }
    
    renderBatch();
}

function renderStudentCard(student, container) {
    const defaultImg = 'img/default.jpg';

    // Tạo các badge vai trò
    let roleBadges = '';
    student.role.forEach(role => {
        let badgeClass = '';
        let badgeText = '';
        
        if (role === 'monitor') {
            badgeClass = 'monitor-badge';
            badgeText = 'Lớp trưởng';
        } else if (role === 'secretary') {
            badgeClass = 'secretary-badge';
            badgeText = 'Thư ký';
        } else if (role === 'group-leader') {
            badgeClass = 'group-leader-badge';
            badgeText = 'Tổ trưởng';
        } else if (role === 'assistant-arts') {
            badgeClass = 'assistant-badge';
            badgeText = 'Lớp phó Văn nghệ';
        } else if (role === 'deputy-labor') {
            badgeClass = 'assistant-badge';
            badgeText = 'Lớp phó Lao động';
        } else if (role === 'studying') {
            badgeClass = 'assistant-badge';
            badgeText = 'Lớp phó Học tập';
        } else {
            badgeClass = 'member-badge';
            badgeText = 'Thành viên';
        }
        
        roleBadges += `<span class="role-badge ${badgeClass}">${badgeText}</span>`;
    });

    // Xác định màu viền theo vai trò đầu tiên
    let borderColor = '';
    if (student.role.includes('monitor')) borderColor = 'border-purple-500';
    else if (student.role.includes('deputy-labor')) borderColor = 'border-green-500';
    else if (student.role.includes('studying')) borderColor = 'border-indigo-500';
    else if (student.role.includes('secretary')) borderColor = 'border-yellow-500';
    else if (student.role.includes('group-leader')) borderColor = 'border-blue-500';
    else if (student.role.includes('assistant-arts')) borderColor = 'border-pink-500';
    // Nếu chỉ là member thì không có border
    if (student.role.length === 1 && student.role[0] === 'member') borderColor = '';

    // Create card element
    const card = document.createElement('div');
    card.className = `student-card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 hover:shadow-lg ${borderColor ? 'border-l-4 ' + borderColor : ''}`;
    card.setAttribute('data-role', student.role.join(' '));
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    card.innerHTML = `
        <div class="h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <img src="${student.img}" alt="${student.name}" 
                class="h-full w-full object-cover"
                onerror="this.src='${defaultImg}';"
                loading="lazy">
        </div>
        <div class="p-5">
            <h3 class="font-bold text-lg">${student.name}</h3>
            <div class="mt-3 flex flex-wrap">
                ${roleBadges}
            </div>
        </div>
    `;
    
    container.appendChild(card);
    
    // Animate in
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    });
}

// Render danh sách đã sắp xếp
renderStudents();

// Filter students while maintaining sort order
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b =>
            b.classList.remove('active', 'bg-white', 'text-purple-600')
        );
        btn.classList.add('active', 'bg-white', 'text-purple-600');

        const filter = btn.dataset.filter;
        
        if (filter === 'all') {
            // Hiển thị tất cả students theo thứ tự đã sắp xếp
            renderStudents();
        } else {
            // Filter students theo role và giữ nguyên thứ tự
            const filterRoles = filter.split(' ');
            const filteredStudents = sortedStudents.filter(student => 
                filterRoles.some(role => student.role.includes(role))
            );
            renderStudents(filteredStudents);
        }
    });
});

// Dark mode toggle
// Enhanced dark mode toggle with animation
const darkModeBtn = document.getElementById('darkModeBtn');
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    
    // Lưu trạng thái dark mode
    if (document.body.classList.contains('dark')) {
        localStorage.setItem('darkMode', 'true');
        darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
    } else {
        localStorage.setItem('darkMode', 'false');
        darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
    }

    // Hiệu ứng nút
    darkModeBtn.classList.add('animate-pulse');
    setTimeout(() => {
        darkModeBtn.classList.remove('animate-pulse');
    }, 300);

    feather.replace();
});

// Khi load lại trang, áp dụng dark mode nếu có
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
} else {
    darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
}
feather.replace();

// Open image modal
function openImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    modal.classList.remove('hidden');
}

// Close image modal
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}

// Pagination setup
let currentPage = 1;
const itemsPerPage = 8; // số ảnh trên 1 trang
let filteredMemories = []; // danh sách sau khi lọc
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    } else {
        pagination.style.display = 'flex';
    }

    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '«';
    prevBtn.className = `px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            showPage(currentPage);
        }
    };
    pagination.appendChild(prevBtn);

    // Numbers
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        button.onclick = () => {
            currentPage = i;
            showPage(currentPage);
        };
        pagination.appendChild(button);
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '»';
    nextBtn.className = `px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            showPage(currentPage);
        }
    };
    pagination.appendChild(nextBtn);
}

function showPage(page) {
    const memories = filteredMemories.length > 0 
        ? filteredMemories 
        : Array.from(document.querySelectorAll('.memory-card')).filter(mem => mem.dataset.type !== "guide");

    const totalItems = memories.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    memories.forEach((item, index) => {
        item.style.display = 'none';
        if (index >= (page - 1) * itemsPerPage && index < page * itemsPerPage) {
            item.style.display = 'block';
        }
    });

    renderPagination(totalPages);
}

// Khởi tạo phân trang sau khi load
showPage(currentPage);

// Search & Sort Memories with debounce
const searchInput = document.getElementById('searchMemory');
const sortSelect = document.getElementById('sortMemory');

// Debounce function for search
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

function filterAndSortMemories() {
    const searchText = searchInput.value.toLowerCase();
    let memories = Array.from(document.querySelectorAll('.memory-card'))
        .filter(mem => mem.dataset.type !== "guide");

    // Lọc
    memories = memories.filter(mem => {
        const title = mem.querySelector('.memory-title').textContent.toLowerCase();
        return title.includes(searchText);
    });

    // Sắp xếp
    const sortValue = sortSelect.value;
    memories.sort((a, b) => {
        if (sortValue === 'title') {
            return a.querySelector('.memory-title').textContent.localeCompare(
                b.querySelector('.memory-title').textContent);
        } else if (sortValue === 'newest') {
            return b.dataset.path.localeCompare(a.dataset.path); // Use path for sorting
        } else if (sortValue === 'oldest') {
            return a.dataset.path.localeCompare(b.dataset.path);
        }
    });

    // Gán lại danh sách đã lọc
    filteredMemories = memories;

    // Render lại
    const grid = document.querySelector('.memory-grid');
    grid.innerHTML = '';
    memories.forEach(mem => grid.appendChild(mem));

    currentPage = 1;
    showPage(currentPage);
}

// Apply debounce to search (300ms delay)
const debouncedFilter = debounce(filterAndSortMemories, 300);
searchInput.addEventListener('input', debouncedFilter);
sortSelect.addEventListener('change', filterAndSortMemories);

// Student Modal Functions
function openStudentModal(name, img, roleText) {
    document.getElementById('studentModalImg').src = img;
    document.getElementById('studentModalName').textContent = name;
    document.getElementById('studentModalRole').textContent = roleText;
    document.getElementById('studentModal').classList.remove('hidden');
    feather.replace();
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.add('hidden');
}

// Smooth scroll with offset (để không bị che bởi navbar)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            e.preventDefault();
            const yOffset = -80; // cao khoảng navbar
            const y = targetEl.getBoundingClientRect().top + window.scrollY + yOffset;

            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    });
});        