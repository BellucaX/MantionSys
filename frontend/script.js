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
const API_BASE = window.MANTION_API_BASE || 'http://localhost:5000/api';

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

if (reserveForm) {
	reserveForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const formData = new FormData(reserveForm);

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
			showVerifyOverlay(
				'กำลังตรวจสอบห้องว่าง...',
				'โปรดรอสักครู่ ระบบกำลังเช็คข้อมูลล่าสุดจากฐานข้อมูล'
			);

			const precheckPromise = requestJson(`${API_BASE}/bookings/precheck`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					roomId: payload.roomId,
					checkInDate: payload.checkInDate,
					checkOutDate: payload.checkOutDate,
					guestCount: payload.guestCount,
				}),
			});

			await waitMs(900);
			const precheckResult = await precheckPromise;

			showVerifyOverlay(
				'กำลังล็อกห้องชั่วคราว...',
				`ล็อกห้องสำเร็จ ${precheckResult.data.holdMinutes} นาที กำลังสร้างขั้นตอนชำระเงิน`
			);

			await waitMs(700);
			const paymentIntent = await requestJson(`${API_BASE}/bookings/payment-intent`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					holdToken: precheckResult.data.holdToken,
					amount: 1000,
				}),
			});

			showVerifyOverlay(
				'พร้อมเข้าสู่การชำระเงิน',
				'ตัวอย่างนี้จำลองการชำระเงินอัตโนมัติและยืนยันการจองทันที'
			);

			await waitMs(900);
			const confirmed = await requestJson(`${API_BASE}/bookings/confirm`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					holdToken: precheckResult.data.holdToken,
					paymentIntentId: paymentIntent.data.paymentIntentId,
					guestName: payload.guestName,
					guestPhone: payload.guestPhone,
				}),
			});

			setReserveStatus(
				`ยืนยันการจองสำเร็จ: Booking #${confirmed.data.id} ห้อง ${confirmed.data.roomId} สถานะ ${confirmed.data.status}`
			);
		} catch (error) {
			setReserveStatus(`ยืนยันห้องไม่สำเร็จ: ${error.message}`);
		} finally {
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

	if (!window.google || !googleBtn) return;
	if (!clientId || clientId.includes('your_google_client_id')) {
		googleBtn.textContent = 'ตั้งค่า google-signin-client_id ก่อนใช้งาน';
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