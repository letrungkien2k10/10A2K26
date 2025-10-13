// These are now initialized in DOMContentLoaded

// Authentication state
let isAuthenticated = false;

// Rate limiting for uploads
let lastUploadTime = 0;
const UPLOAD_COOLDOWN = 5000; // 5 seconds between uploads

// Pagination and filter state for memories
let currentPage = 1;
let filteredMemories = [];
let allMemoryElements = []; // Original list of DOM elements for filter/sort
const itemsPerPage = 20;

// No results div for memories
let noResultsDiv = null;

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

// Create no results div
function createNoResultsDiv() {
    noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'col-span-full text-center py-12';
    noResultsDiv.innerHTML = `
        <i data-feather="image" class="w-16 h-16 mx-auto text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-600 mb-2">Không tìm thấy kết quả</h3>
        <p class="text-gray-500">Hãy thử từ khóa khác!</p>
    `;
    noResultsDiv.style.display = 'none';
    return noResultsDiv;
}

// Apply filter and sort, then paginate
function applyFilterAndSort() {
    const searchText = document.getElementById('searchMemory').value.toLowerCase();
    const sortValue = document.getElementById('sortMemory').value;

    // Filter on original allMemoryElements (DOM elements)
    let filtered = [...allMemoryElements].filter(mem => {
        const title = mem.querySelector('.memory-title').textContent.toLowerCase();
        return title.includes(searchText);
    });

    // Sort
    filtered.sort((a, b) => {
        if (sortValue === 'title') {
            return a.querySelector('.memory-title').textContent.localeCompare(
                b.querySelector('.memory-title').textContent);
        } else if (sortValue === 'newest') {
            return b.dataset.path.localeCompare(a.dataset.path);
        } else if (sortValue === 'oldest') {
            return a.dataset.path.localeCompare(b.dataset.path);
        }
        return 0;
    });

    filteredMemories = filtered;

    // Hide all elements
    allMemoryElements.forEach(el => el.style.display = 'none');

    // Handle no results
    if (filtered.length === 0) {
        if (!noResultsDiv) {
            const grid = document.querySelector('.memory-grid');
            grid.appendChild(createNoResultsDiv());
        }
        noResultsDiv.style.display = 'block';
        renderPagination(1); // Single "page" for no results
        return;
    } else {
        if (noResultsDiv) noResultsDiv.style.display = 'none';
    }

    // Show paginated
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    paginated.forEach((el, idx) => {
        el.classList.add('fade-in-up');
        el.style.animationDelay = `${idx * 0.05}s`;
        el.style.display = 'block';
    });

    renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    // Pagination code (assuming it's truncated, add the full pagination logic here if available)
    // For example:
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'}`;
        btn.addEventListener('click', () => {
            currentPage = i;
            applyFilterAndSort();
        });
        pagination.appendChild(btn);
    }
}

// Show error toast
function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-50';
    toast.innerHTML = `<i data-feather="alert-circle" class="mr-2"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Show success toast
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center z-50';
    toast.innerHTML = `<i data-feather="check-circle" class="mr-2"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Close password modal (assuming there's a modal with id 'passwordModal')
function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.classList.add('hidden');
}

// Check password function (sửa thành async fetch đến server)
async function checkPassword() {
    const passwordInput = document.getElementById('classPassword');
    const password = sanitizeInput(passwordInput.value);

    if (!password) {
        showErrorToast('Vui lòng nhập mật khẩu lớp!');
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/check-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            isAuthenticated = true;
            localStorage.setItem('auth', 'true');
            localStorage.setItem('classPass', btoa(password)); // Lưu password encoded để dùng cho upload
            closePasswordModal();
            showSuccessToast('Xác thực thành công!');
            showMemoryActions();
            updateUploadButtonUI();
        } else {
            showErrorToast(data.error || 'Mật khẩu lớp sai!');
        }
    } catch (err) {
        console.error('Check password error:', err);
        showErrorToast('Lỗi kết nối server!');
    }
}

// Upload image function (sửa để gửi password từ localStorage)
async function uploadImage() {
    if (!canUpload()) return;
    if (!isAuthenticated) {
        showErrorToast('Vui lòng xác thực mật khẩu lớp trước!');
        return;
    }

    const titleInput = document.getElementById('imageTitle');
    const dateInput = document.getElementById('imageDate');
    const fileInput = document.getElementById('imageFile');

    const title = sanitizeInput(titleInput.value);
    const date = dateInput.value;
    const file = fileInput.files[0];

    if (!title || !date || !file) {
        showErrorToast('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    // Kiểm tra file type và size
    if (!file.type.startsWith('image/')) {
        showErrorToast('Chỉ hỗ trợ file ảnh!');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showErrorToast('File quá lớn (tối đa 5MB)!');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const contentBase64 = e.target.result.split(',')[1];
            const storedPass = localStorage.getItem('classPass');
            if (!storedPass) {
                showErrorToast('Mật khẩu không hợp lệ! Vui lòng xác thực lại.');
                return;
            }
            const password = atob(storedPass); // Decode password từ localStorage

            // Hiển thị progress
            const progressDiv = document.getElementById('uploadProgress');
            if (progressDiv) progressDiv.classList.remove('hidden');
            const progressText = document.getElementById('progressText');
            if (progressText) progressText.textContent = 'Đang upload...';

            const response = await fetch('/.netlify/functions/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,  // Gửi password từ localStorage
                    title,
                    date,
                    filename: file.name,
                    contentBase64
                })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccessToast('Upload thành công!');
                // Cập nhật gallery (gọi fetchMemories() hoặc reload memories nếu có hàm)
                lastUploadTime = Date.now();
                // Reset form
                titleInput.value = '';
                dateInput.value = '';
                fileInput.value = '';
                if (progressDiv) progressDiv.classList.add('hidden');
            } else {
                showErrorToast(data.error || 'Upload thất bại!');
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        console.error('Upload error:', err);
        showErrorToast('Lỗi upload!');
    }
}

// Logout function
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('auth');
    localStorage.removeItem('classPass'); // Xóa password lưu
    // Ẩn actions và upload button
    document.querySelectorAll('.memory-actions').forEach(actions => {
        actions.style.display = 'none';
    });
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) uploadBtn.classList.add('hidden');
    showSuccessToast('Đã đăng xuất!');
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
    
    // Open image modal on click
    const img = e.target.closest('.memory-img');
    if (img) {
        openImageModal(img.src);
    }
    
    // Open student modal on click
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

// Scroll to Top button
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

// Counter animation when in viewport
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

// Danh sách học sinh (role là mảng) - Data thực tế
const students = [
    { name: 'Vũ Kim Huệ', role: ['monitor'], img: 'img/hue.jpg' },
    { name: 'Nguyễn Thu Hà', role: ['secretary'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Xuân Hương', role: ['studying'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Đức Linh', role: ['studying'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Phạm Hà Vy', role: ['deputy-labor'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Duy Anh', role: ['group-leader-1'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Khánh Hương', role: ['group-leader-2'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Hoàng Quốc Vương', role: ['group-leader-3'], img: 'img/vuong.jpg' },
    { name: 'Nguyễn Thanh Chúc', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Mạnh Cường', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thanh Thùy Dung', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Trần Đăng Dũng', role: ['member'], img: 'img/dung.jpg' },
    { name: 'Trần Quang Định', role: ['member'], img: 'img/quangdinh.jpg' },
    { name: 'Phạm Minh Đức', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Đỗ Trường Giang', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Trường Giang', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Khắc Hiếu', role: ['member'], img: 'img/hieu.jpg' },
    { name: 'Vi Sỹ Hoan', role: ['member'], img: 'img/vihoan.jpg' },
    { name: 'Nguyễn Văn Huy', role: ['member'], img: 'img/huy.jpg' },
    { name: 'Nguyễn Phú Hương', role: ['member'], img: 'img/phuhung.jpg' },
    { name: 'Trần Vân Khánh', role: ['member'], img: 'img/vankhanh.jpg' },
    { name: 'Lê Trung Kiên', role: ['member'], img: 'img/ADMIN.jpg' },
    { name: 'Nguyễn Trung Kiên', role: ['member'], img: 'img/nguyenkien.jpg' },
    { name: 'Nguyễn Bảo Lâm', role: ['member'], img: 'img/lam.jpg' },
    { name: 'Nguyễn Thu Lê', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Lê Thị Ngọc Linh', role: ['member'], img: 'img/ngoclinh.jpg' },
    { name: 'Nguyễn Hà Nhật Linh', role: ['member'], img: 'img/nhatlinh.jpg' },
    { name: 'Nguyễn Hoàng Linh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Phạm Bảo Nhật Linh', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Bùi Khánh Ly', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Kiều Ngọc Mai', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Xuân Mai', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Hoàng Minh', role: ['member'], img: 'img/minh.jpg' },
    { name: 'Ngô Nguyên Hải Nam', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thành Nam', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Vũ Bảo Ngọc', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Phạm Công Sơn', role: ['member'], img: 'img/hoangquocvuong.jpg' },
    { name: 'Nguyễn Thanh Thảo', role: ['member'], img: 'img/thanhthao.jpg' },
    { name: 'Nguyễn Thị Thân Thương', role: ['member'], img: 'img/thuong.jpg' },
    { name: 'Hoàng Mạnh Tiến', role: ['member'], img: 'img/tien.jpg' },
    { name: 'Nguyễn Thu Trang', role: ['member'], img: 'img/trang.jpg' },
    { name: 'Nguyễn Thanh Tuyển', role: ['member'], img: 'img/tuyen.jpg' },
    { name: 'Đỗ Thy', role: ['member'], img: 'img/thy.jpg' },
    { name: 'Lưu Phương Vy', role: ['member'], img: 'img/phuongvy.jpg' }
];

// Students state
let sortedStudents = [];
let currentFilter = 'all';

// Role priority map (từ cao xuống thấp: monitor > secretary > studying/deputy-labor > group-leader > member)
const rolePriority = {
    'monitor': 7,
    'secretary': 6,
    'studying': 5,
    'deputy-labor': 5,
    'group-leader-1': 4,
    'group-leader-2': 3,
    'group-leader-3': 2,
    'member': 1
};

// Helper: Lấy primary role (role đầu tiên trong mảng)
function getPrimaryRole(student) {
    return student.role && student.role.length > 0 ? student.role[0] : 'member';
}

// Helper: Lấy text role cho badge (thay 'monitor' thành 'Lớp trưởng')
function getRoleText(role) {
    const texts = {
        'monitor': 'Lớp trưởng',
        'secretary': 'Thư ký lớp',
        'studying': 'Phó học tập',
        'deputy-labor': 'Phó lao động',
        'group-leader-1': 'Tổ trưởng 1',
        'group-leader-2': 'Tổ trưởng 2',
        'group-leader-3': 'Tổ trưởng 3',
        'member': 'Thành viên'
    };
    return texts[role] || 'Thành viên';
}

// Function để sort students theo role priority (giảm dần) + alphabet tên
function sortStudentsByRolePriority(studentsToSort) {
    return [...studentsToSort].sort((a, b) => {
        const priorityA = rolePriority[getPrimaryRole(a)] || 1;
        const priorityB = rolePriority[getPrimaryRole(b)] || 1;
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Cao xuống thấp
        }
        return a.name.localeCompare(b.name, 'vi');
    });
}

// Function để render students với sort theo role priority + alphabet
function renderStudents(studentsToRender = students) {
    // Đảm bảo luôn sort trước khi render (an toàn)
    const sorted = sortStudentsByRolePriority(studentsToRender);
    sortedStudents = sorted;

    const container = document.getElementById('student-container');
    if (!container) {
        console.error('Không tìm thấy #student-container!');
        return;
    }
    container.innerHTML = '';

    const countEl = document.getElementById('studentCount');
    if (countEl) countEl.textContent = sortedStudents.length;

    const batchSize = 8;
    let currentIndex = 0;

    function renderBatch() {
        const batch = sortedStudents.slice(currentIndex, currentIndex + batchSize);
        batch.forEach((student, index) => {
            setTimeout(() => {
                renderStudentCard(student, container, currentIndex + index);
            }, index * 50);
        });
        currentIndex += batchSize;
        if (currentIndex < sortedStudents.length) {
            requestAnimationFrame(renderBatch);
        } else {
            // Replace icons sau khi render xong
            if (typeof feather !== 'undefined') feather.replace();
        }
    }
    renderBatch();
}

function renderStudentCard(student, container, index = 0) {
    const defaultImg = 'img/default.jpg';

    // Badge (loop mảng)
    let roleBadges = '';
    student.role.forEach(role => {
        let badgeClass = '';
        let badgeText = getRoleText(role);
        if (role === 'monitor') {
            badgeClass = 'monitor-badge'; 
        } else if (role === 'secretary') {
            badgeClass = 'secretary-badge'; 
        } else if (role === 'group-leader-1' || role === 'group-leader-2' || role === 'group-leader-3') {
            badgeClass = 'group-leader-badge'; 
        } else if (role === 'deputy-labor' || role === 'studying') {
            badgeClass = 'assistant-badge'; 
        } else {
            badgeClass = 'member-badge'; 
        }
        roleBadges += `<span class="role-badge ${badgeClass}">${badgeText}</span>`;
    });

    // Gradient border class (sử dụng includes)
    let borderClass = '';
    if (student.role.includes('monitor')) borderClass = 'student-gradient-monitor';
    else if (student.role.includes('deputy-labor')) borderClass = 'student-gradient-labor';
    else if (student.role.includes('studying')) borderClass = 'student-gradient-study';
    else if (student.role.includes('secretary')) borderClass = 'student-gradient-secretary';
    else if (['group-leader-1', 'group-leader-2', 'group-leader-3'].some(r => student.role.includes(r))) borderClass = 'student-gradient-leader';

    // member thì không có viền
    if (student.role.length === 1 && student.role[0] === 'member') borderClass = '';

    // Create card element (thêm onclick cho modal)
    const card = document.createElement('div');
    card.className = `student-card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 hover:shadow-lg fade-in-up ${borderClass}`;
    card.setAttribute('data-role', student.role.join(' '));
    card.style.animationDelay = `${index * 0.07}s`; // Cascade effect
    card.style.cursor = 'pointer';
    card.onclick = (e) => {
        if (e.target.classList.contains('role-badge')) return;
        openStudentModal(student.name, student.img, roleBadges);
    };
    card.innerHTML = `
        <div class="h-48 w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            <img src="${student.img}" alt="${escapeHtml(student.name)}" 
                class="h-full w-full object-cover"
                onerror="this.src='${defaultImg}';"
                loading="lazy">
        </div>
        <div class="p-5">
            <h3 class="font-bold text-lg">${escapeHtml(student.name)}</h3>
            <div class="mt-3 flex flex-wrap">
                ${roleBadges}
            </div>
        </div>
    `;
    container.appendChild(card);
}

// Function mở modal (nếu chưa có, thêm vào)
function openStudentModal(name, img, badgesHtml) {
    const modalImg = document.getElementById('studentModalImg');
    const modalName = document.getElementById('studentModalName');
    const modalRole = document.getElementById('studentModalRole');
    const modal = document.getElementById('studentModal');
    if (modalImg) modalImg.src = img;
    if (modalName) modalName.textContent = name;
    if (modalRole) modalRole.innerHTML = badgesHtml; // Hiển thị multiple badges
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
    if (typeof feather !== 'undefined') feather.replace();
}

// Open image modal
window.openImageModal = function(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (modal && modalImage) {
        modalImage.src = src;
        modal.classList.remove('hidden');
    }
};

// Close image modal
window.closeImageModal = function() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.classList.add('hidden');
};

// Close student modal
window.closeStudentModal = function() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.classList.add('hidden');
};

// Thêm vào DOMContentLoaded để init students với sort
document.addEventListener('DOMContentLoaded', function() {
    // ... (các phần khác giữ nguyên)

    // Sắp xếp mặc định theo rolePriority + tên
    const sortedDefault = sortStudentsByRolePriority(students);
    renderStudents(sortedDefault);

    // Filter students
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b =>
                b.classList.remove('active', 'bg-white', 'text-purple-600')
            );
            btn.classList.add('active', 'bg-white', 'text-purple-600');

            const filter = btn.dataset.filter;
            const filterRoles = filter.split(' ');

            if (filter === 'all') {
                // Sắp xếp theo role priority trước khi render
                const sortedAll = sortStudentsByRolePriority(students);
                renderStudents(sortedAll);
            } else {
                // Sort theo rolePriority + tên trước
                const sorted = sortStudentsByRolePriority(students);
                // Filter theo role
                const filteredStudents = sorted.filter(student =>
                    student.role.some(role => filterRoles.includes(role))
                );
                renderStudents(filteredStudents);
            }
        });
    });

    // Dark mode toggle
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
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

            if (typeof feather !== 'undefined') feather.replace();
        });

        // Khi load lại trang, áp dụng dark mode nếu có
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark');
            darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
        } else {
            darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    // Smooth scroll with offset
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

    // Placeholder for other functions
    function showMemoryActions() {
        // Show delete/edit buttons if authenticated
        document.querySelectorAll('.memory-actions').forEach(actions => {
            actions.style.display = 'flex';
        });
    }

    function updateUploadButtonUI() {
        // Update upload button if authenticated
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) uploadBtn.classList.remove('hidden');
    }

    // Open image modal
    window.openImageModal = function(src) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        if (modal && modalImage) {
            modalImage.src = src;
            modal.classList.remove('hidden');
        }
    };

    // Close image modal
    window.closeImageModal = function() {
        const modal = document.getElementById('imageModal');
        if (modal) modal.classList.add('hidden');
    };

    // Close student modal
    window.closeStudentModal = function() {
        const modal = document.getElementById('studentModal');
        if (modal) modal.classList.add('hidden');
    };
});

document.getElementById('confirmPasswordBtn').addEventListener('click', checkPassword);