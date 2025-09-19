// Khởi tạo AOS và Feather Icons
AOS.init({
    duration: 800,
    once: true
});
feather.replace();

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC7iJ7GyPBbz1sBZ3y_23y9TPvKO_347sc",
    authDomain: "a2k26-f43d4.firebaseapp.com",
    projectId: "a2k26-f43d4",
    storageBucket: "a2k26-f43d4.firebasestorage.app",
    messagingSenderId: "23390160866",
    appId: "1:23390160866:web:dddec63ea598005be11bbb",
    measurementId: "G-HL140FCQ64",
    databaseURL: "https://a2k26-f43d4-default-rtdb.firebaseio.com/"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const database = firebase.database();
const analytics = firebase.analytics();

// Trạng thái xác thực
let isAuthenticated = false;
const correctPassword = "10A2K26"; // Mật khẩu lớp

// Kiểm tra trạng thái xác thực khi tải trang
document.addEventListener('DOMContentLoaded', function() {
    const authStatus = localStorage.getItem('isAuthenticated');
    isAuthenticated = authStatus === 'true';
    
    if (isAuthenticated) {
        showMemoryActions();
        updateUploadButtonUI();
    }
    
    // Tải danh sách kỷ niệm từ Firebase
    loadMemories();
});

// Cập nhật giao diện nút upload
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

// Mở modal mật khẩu
function openPasswordModal() {
    if (isAuthenticated) {
        openUploadModal();
    } else {
        document.getElementById('passwordModal').classList.remove('hidden');
    }
}

// Đóng modal mật khẩu
function closePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('passwordError').classList.add('hidden');
    document.getElementById('passwordInput').value = '';
}

// Kiểm tra mật khẩu
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
        showSuccessToast("Đăng nhập thành công!");
    } else {
        errorElement.textContent = "Mật khẩu không đúng. Vui lòng thử lại.";
        errorElement.classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Mở modal upload
function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
}

// Đóng modal upload
function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileName').classList.add('hidden');
}

// Xử lý hiển thị file ảnh được chọn
document.getElementById('imageFile').addEventListener('change', function(e) {
    const fileNameElement = document.getElementById('fileName');
    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.size > 5 * 1024 * 1024) { // Giới hạn 5MB
            alert("⚠️ Ảnh vượt quá 5MB. Vui lòng chọn file nhỏ hơn.");
            this.value = "";
            fileNameElement.classList.add('hidden');
            return;
        }
        fileNameElement.textContent = file.name + ` (${(file.size/1024/1024).toFixed(2)} MB)`;
        fileNameElement.classList.remove('hidden');
    } else {
        fileNameElement.classList.add('hidden');
    }
});

// Upload ảnh lên Firebase
async function uploadImage() {
    const title = document.getElementById('imageTitle').value;
    const date = document.getElementById('imageDate').value;
    const file = document.getElementById('imageFile').files[0];
    const isEditing = document.getElementById('uploadForm').dataset.editing;

    if (!title || !date) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    if (!isEditing && !file) {
        alert('Vui lòng chọn ảnh!');
        return;
    }

    try {
        if (isEditing) {
            // Cập nhật kỷ niệm
            const memoryRef = database.ref(`memories/${isEditing}`);
            const updates = { title, date };

            if (file) {
                const storageRef = storage.ref(`memories/${isEditing}_${file.name}`);
                await storageRef.put(file);
                const imageUrl = await storageRef.getDownloadURL();
                updates.imageUrl = imageUrl;
            }

            await memoryRef.update(updates);
            showSuccessToast("Cập nhật ảnh thành công!");
        } else {
            // Thêm kỷ niệm mới
            const memoryId = Date.now();
            const storageRef = storage.ref(`memories/${memoryId}_${file.name}`);
            await storageRef.put(file);
            const imageUrl = await storageRef.getDownloadURL();

            await database.ref(`memories/${memoryId}`).set({
                id: memoryId,
                title,
                date,
                imageUrl
            });

            showSuccessToast("Thêm ảnh thành công!");
        }

        closeUploadModal();
        document.getElementById('uploadForm').removeAttribute('data-editing');
        loadMemories();
    } catch (error) {
        console.error("Lỗi khi upload ảnh:", error);
        alert("Có lỗi xảy ra khi upload ảnh. Vui lòng thử lại.");
    }
}

// Hiển thị thông báo thành công
function showSuccessToast(message = "Upload ảnh thành công!") {
    const toast = document.getElementById('successToast');
    toast.querySelector('span').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Hiển thị nút chỉnh sửa/xóa
function showMemoryActions() {
    const memoryActions = document.querySelectorAll('.memory-actions');
    memoryActions.forEach(actions => {
        if (actions) {
            actions.style.display = isAuthenticated ? 'flex' : 'none';
        }
    });
}

// Tải kỷ niệm từ Firebase
async function loadMemories() {
    const memoryGrid = document.querySelector('.memory-grid');
    memoryGrid.innerHTML = ''; // Xóa danh sách hiện tại

    try {
        const snapshot = await database.ref('memories').once('value');
        const memories = snapshot.val();

        if (memories) {
            Object.values(memories).forEach(memory => {
                const memoryId = memory.id;
                const newMemory = document.createElement('div');
                newMemory.className = 'memory-card';
                newMemory.dataset.id = memoryId;
                newMemory.innerHTML = `
                    <img src="${memory.imageUrl}" alt="${memory.title}" class="memory-img">
                    <div class="memory-overlay">
                        <h3 class="memory-title">${memory.title}</h3>
                        <p class="memory-date">${new Date(memory.date).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div class="memory-actions">
                        <button class="memory-action-btn edit-btn" onclick="editMemory(${memoryId})">
                            <i data-feather="edit" class="w-4 h-4"></i>
                        </button>
                        <button class="memory-action-btn delete-btn" onclick="deleteMemory(${memoryId})">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                memoryGrid.prepend(newMemory);
            });
            feather.replace();
            showPage(currentPage);
        }
    } catch (error) {
        console.error("Lỗi khi tải kỷ niệm:", error);
        alert("Có lỗi xảy ra khi tải kỷ niệm. Vui lòng thử lại.");
    }
}

// Đăng xuất
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    showMemoryActions();
    updateUploadButtonUI();
    showSuccessToast("Đã đăng xuất!");
    closeUploadModal();
}

// Xóa kỷ niệm
async function deleteMemory(id) {
    if (!isAuthenticated) {
        showSuccessToast("Vui lòng đăng nhập để thực hiện!");
        openPasswordModal();
        return;
    }

    if (confirm("Bạn có chắc chắn muốn xóa ảnh này?")) {
        try {
            const memoryItem = document.querySelector(`.memory-card[data-id="${id}"]`);
            if (memoryItem) {
                memoryItem.classList.add('opacity-0', 'scale-95');
                await database.ref(`memories/${id}`).remove();
                setTimeout(() => {
                    memoryItem.remove();
                    showSuccessToast("Đã xóa ảnh thành công!");
                    showPage(currentPage);
                }, 300);
            }
        } catch (error) {
            console.error("Lỗi khi xóa kỷ niệm:", error);
            alert("Có lỗi xảy ra khi xóa ảnh. Vui lòng thử lại.");
        }
    }
}

// Chỉnh sửa kỷ niệm
function editMemory(id) {
    if (!isAuthenticated) {
        showSuccessToast("Vui lòng đăng nhập để thực hiện!");
        openPasswordModal();
        return;
    }

    const memoryItem = document.querySelector(`.memory-card[data-id="${id}"]`);
    if (memoryItem) {
        const title = memoryItem.querySelector('.memory-title').textContent;
        const date = memoryItem.querySelector('.memory-date').textContent;
        
        document.getElementById('imageTitle').value = title;
        document.getElementById('imageDate').value = new Date(date).toISOString().split('T')[0];
        document.getElementById('uploadForm').dataset.editing = id;
        
        openUploadModal();
    }
}

// Xử lý sự kiện click cho nút xóa và chỉnh sửa
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        deleteMemory(memoryItem.dataset.id);
    }
    
    if (e.target.closest('.edit-btn')) {
        const memoryItem = e.target.closest('.memory-card');
        editMemory(memoryItem.dataset.id);
    }
});

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
    if (event.target.id === 'passwordModal') {
        closePasswordModal();
    }
    if (event.target.id === 'uploadModal') {
        closeUploadModal();
    }
};

// Toggle menu di động
const mobileMenuBtn = document.querySelector('.mobile-menu-button');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('-translate-y-5');
        mobileMenu.classList.toggle('opacity-0');
    });
}

// Scroll to top
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

// Counter animation
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

// Danh sách học sinh
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

// Render danh sách học sinh
students.forEach((student) => {
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

// Lọc học sinh
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

// Toggle dark mode
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

// Áp dụng dark mode khi tải trang
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    darkModeBtn.innerHTML = '<i data-feather="sun"></i>';
} else {
    darkModeBtn.innerHTML = '<i data-feather="moon"></i>';
}
feather.replace();

// Mở modal ảnh
function openImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    modal.classList.remove('hidden');
}

// Đóng modal ảnh
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}

// Gán sự kiện click cho ảnh
document.addEventListener('click', function(e) {
    const img = e.target.closest('.memory-img');
    if (img) {
        openImageModal(img.src);
    }
});

// Phân trang
let currentPage = 1;
const itemsPerPage = 8;
let filteredMemories = [];

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    } else {
        pagination.style.display = 'flex';
    }

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

// Tìm kiếm và sắp xếp kỷ niệm
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
            return b.dataset.id - a.dataset.id;
        } else if (sortValue === 'oldest') {
            return a.dataset.id - b.dataset.id;
        }
    });

    filteredMemories = memories;
    const grid = document.querySelector('.memory-grid');
    grid.innerHTML = '';
    memories.forEach(mem => grid.appendChild(mem));

    currentPage = 1;
    showPage(currentPage);
}

searchInput.addEventListener('input', filterAndSortMemories);
sortSelect.addEventListener('change', filterAndSortMemories);

// Modal học sinh
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

// Gán sự kiện click cho student-card
document.addEventListener('click', function(e) {
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

// Cuộn mượt mà
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