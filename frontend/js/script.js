const menuToggle = document.getElementById('menuToggle');
const siteNav = document.getElementById('siteNav');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const authStatus = document.getElementById('authStatus');
const reserveForm = document.getElementById('reserveForm');
const reserveStatus = document.getElementById('reserveStatus');
const verifyOverlay = document.getElementById('verifyOverlay');
const verifyTitle = document.getElementById('verifyTitle');
const verifyText = document.getElementById('verifyText');
const paymentOverlay = document.getElementById('paymentOverlay');
const paymentAmountDisplay = document.getElementById('paymentAmountDisplay');
const qrCodeImage = document.getElementById('qrCodeImage');
const btnMockPaymentSuccess = document.getElementById('btnMockPaymentSuccess');
const btnCancelPayment = document.getElementById('btnCancelPayment');
const timerDisplay = document.getElementById('timer');
const slipInput = document.getElementById('slipInput');
const slipPreview = document.getElementById('slipPreview');
const previewImg = document.getElementById('previewImg');

const REQUEST_TIMEOUT_MS = 12000;

if (menuToggle && siteNav) {
	menuToggle.addEventListener('click', () => {
		siteNav.classList.toggle('open');
	});

	siteNav.querySelectorAll('a').forEach((link) => {
		link.addEventListener('click', () => siteNav.classList.remove('open'));
	});
}

const revealItems = document.querySelectorAll('.section-reveal');
const API_BASE = window.MANTION_API_BASE || 'http://localhost:5001/api';

function setAuthStatus(message) {
	if (authStatus) {
		authStatus.textContent = message;
	}
}

function saveToken(token) {
	localStorage.setItem('mantionToken', token);
}

function getToken() {
	return localStorage.getItem('mantionToken');
}

function setReserveStatus(message) {
	if (reserveStatus) {
		reserveStatus.textContent = message;
	}
}

function showVerifyOverlay(title, text) {
	if (verifyOverlay) {
		verifyOverlay.hidden = false;
	}
	if (verifyTitle) {
		verifyTitle.textContent = title;
	}
	if (verifyText) {
		verifyText.textContent = text;
	}
}

function hideVerifyOverlay() {
	if (verifyOverlay) {
		verifyOverlay.hidden = true;
	}
}

function waitMs(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	let response;
	try {
		response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('การเชื่อมต่อล่าช้าเกินไป กรุณาลองใหม่');
		}
		throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
	} finally {
		clearTimeout(timeoutId);
	}

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.message || 'Request failed');
	}
	return data;
}

async function refreshProfile() {
	const token = getToken();
	if (!token) {
		setAuthStatus('ยังไม่ได้เข้าสู่ระบบ');
		return;
	}

	try {
		const result = await requestJson(`${API_BASE}/auth/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		setAuthStatus(`เข้าสู่ระบบแล้ว: ${result.data.name} (${result.data.email})`);
	} catch (error) {
		localStorage.removeItem('mantionToken');
		setAuthStatus('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
	}
}

if (registerForm) {
	registerForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const formData = new FormData(registerForm);
		const password = String(formData.get('password') || '');
		const confirmPassword = String(formData.get('confirmPassword') || '');

		if (password !== confirmPassword) {
			setAuthStatus('สมัครสมาชิกไม่สำเร็จ: รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน');
			return;
		}

		try {
			const result = await requestJson(`${API_BASE}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formData.get('name'),
					email: formData.get('email'),
					password,
					confirmPassword,
				}),
			});

			saveToken(result.data.token);
			registerForm.reset();
			setAuthStatus(`สมัครสมาชิกสำเร็จ: ${result.data.user.name}`);
		} catch (error) {
			setAuthStatus(`สมัครสมาชิกไม่สำเร็จ: ${error.message}`);
		}
	});
}

if (loginForm) {
	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const formData = new FormData(loginForm);

		try {
			const result = await requestJson(`${API_BASE}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: formData.get('email'),
					password: formData.get('password'),
				}),
			});

			saveToken(result.data.token);
			setAuthStatus(`เข้าสู่ระบบสำเร็จ: ${result.data.user.name}`);
		} catch (error) {
			setAuthStatus(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
		}
	});
}

// แก้ไขส่วนท้ายของ reserveForm ใน script.js
if (reserveForm) {
    reserveForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(reserveForm);

        // 1. ดึงข้อมูลจากฟอร์มมาสร้าง Payload (ห้ามลบส่วนนี้)
        const payload = {
            roomId: Number(formData.get('roomId')),
            checkInDate: formData.get('checkInDate'),
            checkOutDate: formData.get('checkOutDate'),
            guestCount: Number(formData.get('guestCount')),
            guestName: String(formData.get('guestName') || '').trim(),
            guestPhone: String(formData.get('guestPhone') || '').trim(),
        };

        if (!payload.checkInDate || !payload.checkOutDate) {
            setReserveStatus('กรุณาเลือกวันเช็คอินและเช็คเอาต์');
            return;
        }

        try {
            showVerifyOverlay('กำลังตรวจสอบห้องว่าง...', 'โปรดรอสักครู่ ระบบกำลังเช็คข้อมูลล่าสุด');

            // 2. เรียก API Precheck เพื่อล็อกห้องชั่วคราว
            const precheckResult = await requestJson(`${API_BASE}/bookings/precheck`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: payload.roomId,
                    checkInDate: payload.checkInDate,
                    checkOutDate: payload.checkOutDate,
                    guestCount: payload.guestCount,
                }),
            });

            // 3. เก็บข้อมูลที่จำเป็นลง SessionStorage เพื่อเอาไปใช้หน้า Payment
            const bookingData = {
                ...payload,
                holdToken: precheckResult.data.holdToken,
                roomName: reserveForm.querySelector('select[name="roomId"] option:checked').text,
                amount: 1000 // ในอนาคตสามารถดึงราคาจริงจาก API มาใส่ตรงนี้ได้
            };
            sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));

            // 4. เปลี่ยนหน้าไปยังหน้าชำระเงิน
            window.location.href = 'payment.html';

        } catch (error) {
            setReserveStatus(`เกิดข้อผิดพลาด: ${error.message}`);
            hideVerifyOverlay();
        }
    });
}

hideVerifyOverlay();
window.addEventListener('pageshow', hideVerifyOverlay);

window.handleGoogleCredentialResponse = async (response) => {
	try {
		const result = await requestJson(`${API_BASE}/auth/google`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idToken: response.credential }),
		});

		saveToken(result.data.token);
		setAuthStatus(`Google Login สำเร็จ: ${result.data.user.name}`);
	} catch (error) {
		setAuthStatus(`Google Login ไม่สำเร็จ: ${error.message}`);
	}
};

function initGoogleQuickLogin() {
	const metaClientId = document.querySelector('meta[name="google-signin-client_id"]');
	const clientId = metaClientId ? metaClientId.content : '';
	const googleBtn = document.getElementById('googleBtn');

	if (!window.google || !googleBtn) {
		// แสดง placeholder เมื่อ Google SDK ยังโหลดไม่สำเร็จ
		if (googleBtn && (!clientId || clientId.includes('your_google_client_id'))) {
			googleBtn.innerHTML = '<span class="google-placeholder-text">⚙️ ตั้งค่า Google Client ID ก่อนใช้งาน Quick Login</span>';
		}
		return;
	}
	if (!clientId || clientId.includes('your_google_client_id')) {
		googleBtn.innerHTML = '<span class="google-placeholder-text">⚙️ ตั้งค่า Google Client ID ก่อนใช้งาน Quick Login</span>';
		return;
	}

	window.google.accounts.id.initialize({
		client_id: clientId,
		callback: window.handleGoogleCredentialResponse,
	});

	window.google.accounts.id.renderButton(googleBtn, {
		theme: 'outline',
		size: 'large',
		shape: 'pill',
		text: 'signin_with',
	});
}

revealItems.forEach((item, sectionIndex) => {
	item.style.setProperty('--reveal-delay', `${Math.min(sectionIndex * 70, 220)}ms`);
	const staggerItems = item.querySelectorAll('.stagger-list > *');
	staggerItems.forEach((child, childIndex) => {
		child.style.setProperty('--item-delay', `${childIndex * 120}ms`);
	});
});

const revealObserver = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add('visible');
				revealObserver.unobserve(entry.target);
			}
		});
	},
	{
		rootMargin: '0px 0px -8% 0px',
		threshold: 0.1,
	}
);

revealItems.forEach((item) => revealObserver.observe(item));

refreshProfile();

window.addEventListener('load', () => {
	initGoogleQuickLogin();
});

document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(sessionStorage.getItem('pendingBooking'));
    if (!data) return;

    // --- 1. แสดงข้อมูลและสร้าง QR Code (จำลอง) ---
    document.getElementById('sumRoom').textContent = data.roomName;
    document.getElementById('sumPrice').textContent = `฿${data.amount.toLocaleString()}`;
    
    // สร้าง QR Code (ในที่นี้ใช้ URL จำลอง หรือข้อความ PromptPay)
    new QRCode(document.getElementById("qrcode"), {
        text: `https://promptpay.io/0812345678/${data.amount}`, // แทนที่ด้วยเบอร์จริงได้
        width: 180,
        height: 180
    });

    // --- 2. ระบบนับเวลาถอยหลัง 10 นาที ---
    let timeLeft = 600; // 10 minutes in seconds
    const timerElement = document.getElementById('timer');
    const interval = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            alert('หมดเวลาชำระเงิน กรุณาทำการจองใหม่');
            window.location.href = 'index.html';
        }
        timeLeft--;
    }, 1000);

    // --- 3. ตรวจสอบการเลือกไฟล์สลิป ---
    const slipInput = document.getElementById('slipInput');
    const confirmBtn = document.getElementById('confirmBtn');
    
    slipInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('previewImg').src = e.target.result;
                document.getElementById('slipPreview').style.display = 'block';
                confirmBtn.disabled = false; // ปลดล็อกปุ่มเมื่อมีไฟล์
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    // --- 4. กดยืนยัน (จำลองการตรวจสอบสลิป) ---
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner"></span> กำลังตรวจสอบสลิป...';
        
        // จำลอง Delay เหมือนระบบกำลัง Scan สลิปจริง
        setTimeout(async () => {
            try {
                await requestJson(`${API_BASE}/bookings/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        holdToken: data.holdToken,
                        guestName: data.guestName,
                        guestPhone: data.guestPhone,
                        paymentIntentId: "SLIP_VERIFIED_" + Math.random().toString(36).substr(2, 9)
                    }),
                });

                alert('ระบบได้รับหลักฐานการโอนเงินแล้ว! การจองสำเร็จ');
                sessionStorage.removeItem('pendingBooking');
                window.location.href = 'index.html';
            } catch (err) {
                alert('ยืนยันไม่สำเร็จ: ' + err.message);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'ยืนยันและส่งหลักฐาน';
            }
        }, 2500); // รอ 2.5 วินาทีให้ดูเหมือนตรวจสอบจริง
    });
});