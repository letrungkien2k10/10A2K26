// Initialize AOS and Feather Icons
AOS.init({
    duration: 800,
    once: true
});
feather.replace();

// Load Netlify Identity SDK
import { Identity } from 'https://identity.netlify.com/v1/netlify-identity.js';

// Authentication state
let isAuthenticated = false;

// Initialize Identity
const identity = new Identity();
identity.on('login', user => {
    isAuthenticated = true;
    localStorage.setItem('isAuthenticated', 'true');
    showMemoryActions();
    updateUploadButtonUI();
    loadMemories(1);
    showSuccessToast("Đăng nhập thành công!");
});

identity.on('logout', () => {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    updateUploadButtonUI();
    loadMemories(1);
    document.querySelectorAll('.memory-actions').forEach(el => el.style.display = 'none');
});

document.addEventListener('DOMContentLoaded', function() {
    isAuthenticated = identity.currentUser() !== null;
    
    if (isAuthenticated) {
        showMemoryActions();
        updateUploadButtonUI();
    }
    loadMemories(1); // Load ban đầu với page 1
    applyDarkModePreference();
    checkCounters();
    renderStudentList();
});

function applyDarkModePreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark');
    }
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'true') {
        document.body.classList.add('dark');
        document.getElementById('darkModeBtn').innerHTML = '<i data-feather="sun"></i>';
    } else {
        document.getElementById('darkModeBtn').innerHTML = '<i data-feather="moon"></i>';
    }
    feather.replace();
}

const darkModeBtn = document.getElementById('darkModeBtn');
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    
    if (document.body.classList.contains('dark')) {
        localStorage.setItem('darkMode', 'true');
        darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
    } else {
        localStorage.setItem('darkMode', 'false');
        darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
    }

    darkModeBtn.classList.add('animate-pulse');
    setTimeout(() => {
        darkModeBtn.classList.remove('animate-pulse');
    }, 300);

    feather.replace();
});

async function loadMemories(page = 1, limit = 8) {
    try {
        const resp = await fetch(`/.netlify/functions/get-memories?page=${page}&limit=${limit}`);
        if (!resp.ok) throw new Error('Failed to load memories');
        const { data: memories, total, page: currentPage, limit: itemsPerPage } = await resp.json();
        console.log('Memories data from API:', memories);

        const grid = document.querySelector('.memory-grid');
        const fragment = document.createDocumentFragment();

        memories.forEach(mem => {
            const memoryCard = document.createElement('div');
            memoryCard.className = 'memory-card';
            memoryCard.dataset.path = mem.path;
            memoryCard.innerHTML = `
                <img src="${mem.url}" alt="${mem.title}" class="memory-img">
                <div class="memory-overlay">
                    <h3 class="memory-title">${mem.title}</h3>
                    <p class="memory-date">${new Date(mem.date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div class="memory-actions" style="display: ${isAuthenticated ? 'flex' : 'none'};">
                    <div class="memory-action-btn edit-btn"><i data-feather="edit"></i></div>
                    <div class="memory-action-btn delete-btn"><i data-feather="trash-2"></i></div>
                </div>
            `;
            fragment.appendChild(memoryCard);
        });

        grid.innerHTML = ''; // Xóa nội dung cũ trước khi thêm mới
        grid.appendChild(fragment);
        feather.replace();
        filterAndSortMemories();
        setupInfiniteScroll(total, itemsPerPage);
    } catch (err) {
        console.error('Load memories error:', err);
        showSuccessToast("Lỗi load kỷ niệm: " + err.message, true);
    }
}

function setupInfiniteScroll(total, limit) {
    const grid = document.querySelector('.memory-grid');
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && grid.children.length < total) {
            const nextPage = Math.ceil(grid.children.length / limit) + 1;
            loadMemories(nextPage, limit);
        }
    }, { threshold: 0.1 });
    observer.observe(grid.lastElementChild);
}

function updateUploadButtonUI() {
    const uploadBtn = document.getElementById('uploadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileUploadBtn = document.getElementById('mobileUploadBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (isAuthenticated) {
        uploadBtn.onclick = openUploadModal;
        uploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        logoutBtn.onclick = () => identity.logout();
        logoutBtn.classList.remove('hidden');

        mobileUploadBtn.onclick = openUploadModal;
        mobileUploadBtn.innerHTML = '<i data-feather="upload" class="mr-2"></i> Upload ảnh';
        mobileLogoutBtn.onclick = () => identity.logout();
        mobileLogoutBtn.classList.remove('hidden');
    } else {
        uploadBtn.onclick = openPasswordModal;
        uploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Đăng nhập';
        logoutBtn.classList.add('hidden');

        mobileUploadBtn.onclick = openPasswordModal;
        mobileUploadBtn.innerHTML = '<i data-feather="lock" class="mr-2"></i> Đăng nhập';
        mobileLogoutBtn.classList.add('hidden');
    }
    feather.replace();
}

function openPasswordModal() {
    if (!isAuthenticated) {
        identity.open();
    } else {
        openUploadModal();
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('passwordError').classList.add('hidden');
    document.getElementById('passwordInput').value = '';
}

function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileName').classList.add('hidden');
}

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

function uploadImage() {
    const title = document.getElementById('imageTitle').value;
    const date = document.getElementById('imageDate').value;
    const file = document.getElementById('imageFile').files[0];

    if (!title || !date || !file) {
        alert('⚠️ Vui lòng nhập đầy đủ thông tin và chọn ảnh!');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        try {
            const resp = await fetch('/.netlify/functions/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, date, filename: file.name, contentBase64: base64 })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Upload lỗi");

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

            closeUploadModal();
            showSuccessToast("Thêm ảnh thành công!");
            feather.replace();
        } catch (err) {
            alert("❌ Có lỗi khi upload: " + err.message);
        }
    };
    reader.readAsDataURL(file);
}

function showSuccessToast(message = "Upload ảnh thành công!") {
    const toast = document.getElementById('successToast');
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showMemoryActions() {
    const memoryActions = document.querySelectorAll('.memory-actions');
    memoryActions.forEach(actions => {
        if (actions) {
            actions.style.display = isAuthenticated ? 'flex' : 'none';
        }
    });
}

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

            const memoryItem = document.querySelector(`.memory-card[data-path="${path}"]`);
            if (memoryItem) {
                memoryItem.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    memoryItem.remove();
                    showSuccessToast("Đã xóa ảnh thành công!");
                }, 300);
            }
        } catch (err) {
            alert("❌ Có lỗi khi xóa: " + err.message);
        }
    }
}

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

document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        deleteMemory(memoryItem.dataset.path);
    }
    
    if (e.target.closest('.edit-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        editMemory(memoryItem.dataset.path);
    }
    
    const img = e.target.closest('.memory-img');
    if (img) {
        openImageModal(img.src);
    }
    
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

window.onclick = function(event) {
    if (event.target.id === 'passwordModal') closePasswordModal();
    if (event.target.id === 'uploadModal') closeUploadModal();
    if (event.target.id === 'imageModal') closeImageModal();
    if (event.target.id === 'studentModal') closeStudentModal();
}

const mobileMenuBtn = document.querySelector('.mobile-menu-button');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('-translate-y-5');
        mobileMenu.classList.toggle('opacity-0');
    });
}

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
        if (rect.top < window.innerHeight && rect.bottom > 0 && counter.textContent === '0') {
            animateCounter(counter);
        }
    });
}
window.addEventListener('scroll', checkCounters);
window.addEventListener('load', checkCounters);

const studentContainer = document.getElementById('student-container');

const students = [
    { name: 'Hoàng Quốc Vương', role: ['monitor'], img: 'img/vuong.jpg' },
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
    { name: 'Nguyễn Hoàng Minh', role: ['member'], img: 'img/minh.jpg' },
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

function renderStudentList() {
    const studentContainer = document.getElementById('student-container');
    studentContainer.innerHTML = ''; // Clear existing content

    students.forEach(student => {
        const defaultImg = 'img/default.jpg';

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

        let borderColor = '';
        if (student.role.includes('monitor')) borderColor = 'border-purple-500';
        else if (student.role.includes('deputy-labor')) borderColor = 'border-green-500';
        else if (student.role.includes('studying')) borderColor = 'border-indigo-500';
        else if (student.role.includes('secretary')) borderColor = 'border-yellow-500';
        else if (student.role.includes('group-leader')) borderColor = 'border-blue-500';
        else if (student.role.includes('assistant-arts')) borderColor = 'border-pink-500';
        if (student.role.length === 1 && student.role[0] === 'member') borderColor = '';

        studentContainer.innerHTML += `
            <div class="student-card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 hover:shadow-lg ${borderColor ? 'border-l-4 ' + borderColor : ''}" data-role="${student.role.join(' ')}">
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
            </div>
        `;
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b =>
                b.classList.remove('active', 'bg-white', 'text-purple-600')
            );
            btn.classList.add('active', 'bg-white', 'text-purple-600');

            const filter = btn.dataset.filter;
            document.querySelectorAll('.student-card').forEach(card => {
                const roles = card.dataset.role.split(' ');
                if (filter === 'all') {
                    card.classList.remove('hidden');
                } else {
                    const filterRoles = filter.split(' ');
                    card.classList.toggle('hidden', !filterRoles.some(r => roles.includes(r)));
                }
            });
        });
    });
}

function openImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    modal.classList.remove('hidden');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}

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

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            e.preventDefault();
            const yOffset = -80;
            const y = targetEl.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    });
});

const searchInput = document.getElementById('searchMemory');
const sortSelect = document.getElementById('sortMemory');

function filterAndSortMemories() {
    const searchText = searchInput.value.toLowerCase();
    let memories = Array.from(document.querySelectorAll('.memory-card'))
        .filter(mem => mem.dataset.type !== "guide");

    memories = memories.filter(mem => {
        const title = mem.querySelector('.memory-title').textContent.toLowerCase();
        return title.includes(searchText);
    });

    const sortValue = sortSelect.value;
    memories.sort((a, b) => {
        if (sortValue === 'title') {
            return a.querySelector('.memory-title').textContent.localeCompare(
                b.querySelector('.memory-title').textContent);
        } else if (sortValue === 'newest') {
            return b.dataset.path.localeCompare(a.dataset.path);
        } else if (sortValue === 'oldest') {
            return a.dataset.path.localeCompare(b.dataset.path);
        }
    });

    const grid = document.querySelector('.memory-grid');
    grid.innerHTML = '';
    memories.forEach(mem => grid.appendChild(mem));
}

searchInput.addEventListener('input', filterAndSortMemories);
sortSelect.addEventListener('change', filterAndSortMemories);

// Khởi tạo ban đầu
loadMemories(1);