let currentTabId = null;
let retryCount = 0;
const MAX_RETRIES = 3;

async function getCurrentTab() {
	return new Promise((resolve) => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			resolve(tabs[0]);
		});
	});
}

async function saveBrightness(tabId, value) {
	return new Promise((resolve) => {
		chrome.storage.local.set({ [`brightness_${tabId}`]: value }, resolve);
	});
}

async function loadBrightness(tabId) {
	return new Promise((resolve) => {
		chrome.storage.local.get([`brightness_${tabId}`], (result) => {
			resolve(result[`brightness_${tabId}`] ?? 100);
		});
	});
}

async function ensureContentScript(tabId) {
	try {
		await chrome.tabs.sendMessage(tabId, { type: "PING" });
		return true;
	} catch (error) {
		console.log("Content script not ready, injecting...");

		try {
			await chrome.scripting.executeScript({
				target: { tabId: tabId },
				files: ["content.js"]
			});
			await new Promise((resolve) => setTimeout(resolve, 150));
			return true;
		} catch (injectError) {
			console.error("Failed to inject content script:", injectError);
			return false;
		}
	}
}

async function sendMessageWithRetry(tabId, message, retries = MAX_RETRIES) {
	for (let i = 0; i < retries; i++) {
		try {
			const response = await chrome.tabs.sendMessage(tabId, message);
			return response;
		} catch (error) {
			console.log(`Message attempt ${i + 1} failed:`, error.message);

			if (i === 0) {
				const injected = await ensureContentScript(tabId);
				if (!injected && i === retries - 1) {
					throw new Error("Content script injection failed");
				}
			}

			if (i < retries - 1) {
				await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
			}
		}
	}
	throw new Error(`Failed to send message after ${retries} attempts`);
}

async function getPageBrightness(tabId) {
	try {
		const response = await sendMessageWithRetry(tabId, { type: "GET_BRIGHTNESS" });
		return response.value;
	} catch (error) {
		console.error("Get brightness failed:", error);
		return null;
	}
}

async function applyBrightness(tabId, value) {
	try {
		await sendMessageWithRetry(tabId, {
			type: "SET_BRIGHTNESS",
			value: value
		});
		return true;
	} catch (error) {
		console.error("Apply brightness failed:", error);
		return false;
	}
}

class CustomSlider {
	constructor(trackEl, valueDisplayEl, presets, resetBtn) {
		this.track = trackEl;
		this.fill = trackEl.querySelector(".slider-fill");
		this.thumb = trackEl.querySelector(".slider-thumb");
		this.valueDisplay = valueDisplayEl;
		this.valueDisplayWrapper = valueDisplayEl.parentElement || valueDisplayEl;
		this.presets = presets;
		this.resetBtn = resetBtn;
		this.min = 0;
		this.max = 100;
		this.step = 1;
		this.scrollStep = 5;
		this.duration = 400;
		this.easing = (t) => 1 - Math.pow(1 - t, 3);
		this.value = 100;
		this.displayValue = 100;
		this.rafId = null;
		this.dragging = false;
		this._animStartTime = null;
		this._animDuration = null;
		this._animStartValue = null;
		this._animEndValue = null;
		this.bindEvents();
	}

	getScale(value) {
		return value / 100;
	}

	setValueInstant(value) {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this._animStartTime = null;
		this._animDuration = null;
		this._animStartValue = null;
		this._animEndValue = null;
		this.value = Math.max(this.min, Math.min(this.max, Math.round(value)));
		this.displayValue = this.value;
		this.fill.style.transform = `scaleX(${this.getScale(this.value)})`;
		this.updateThumbPosition(this.value);
		this.valueDisplay.textContent = `${Math.round(this.value)}%`;
		if (this.valueDisplayWrapper) this.valueDisplayWrapper.classList.remove("updating");
		this.valueDisplay.classList.remove("updating");
		this.updatePresets(this.value);
		this.updateAria();
		this.applyLive(this.value);
	}

	async setValueAnimated(targetValue, duration = this.duration) {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			const now = performance.now();
			const elapsed = now - (this._animStartTime || now);
			const progress = Math.min(elapsed / (this._animDuration || duration), 1);
			const eased = this.easing(progress);
			const current = (this._animStartValue ?? this.value) + ((this._animEndValue ?? this.value) - (this._animStartValue ?? this.value)) * eased;
			const snapped = Math.round(current);
			this.value = snapped;
			this.displayValue = snapped;
			this.fill.style.transform = `scaleX(${this.getScale(snapped)})`;
			this.updateThumbPosition(snapped);
			this.valueDisplay.textContent = `${snapped}%`;
			this.updatePresets(snapped);
			this.updateAria();
			this.applyLive(snapped);
			if (this.valueDisplayWrapper) this.valueDisplayWrapper.classList.remove("updating");
			this.valueDisplay.classList.remove("updating");
			this.rafId = null;
		}

		const startValue = this.value;
		const endValue = Math.max(this.min, Math.min(this.max, Math.round(targetValue)));
		const displayStart = this.displayValue;

		if (startValue === endValue) {
			this.setValueInstant(endValue);
			return;
		}

		if (this.valueDisplayWrapper) this.valueDisplayWrapper.classList.add("updating");
		this.valueDisplay.classList.add("updating");

		const startTime = performance.now();
		this._animStartTime = startTime;
		this._animDuration = duration;
		this._animStartValue = startValue;
		this._animEndValue = endValue;
		let lastApplied = startValue;

		return new Promise((resolve) => {
			const step = (now) => {
				const progress = Math.min((now - startTime) / duration, 1);
				const eased = this.easing(progress);
				const current = startValue + (endValue - startValue) * eased;
				const displayCurrent = displayStart + (endValue - displayStart) * eased;

				this.fill.style.transform = `scaleX(${this.getScale(current)})`;
				this.updateThumbPosition(current);
				this.valueDisplay.textContent = `${Math.round(displayCurrent)}%`;
				this.updatePresets(current);

				const rounded = Math.round(current);
				if (rounded !== lastApplied) {
					lastApplied = rounded;
					this.applyLive(rounded);
				}

				if (progress < 1) {
					this.rafId = requestAnimationFrame(step);
				} else {
					this.rafId = null;
					this._animStartTime = null;
					this._animDuration = null;
					this._animStartValue = null;
					this._animEndValue = null;
					this.value = endValue;
					this.displayValue = endValue;
					this.fill.style.transform = `scaleX(${this.getScale(endValue)})`;
					this.updateThumbPosition(endValue);
					this.valueDisplay.textContent = `${Math.round(endValue)}%`;
					if (this.valueDisplayWrapper) this.valueDisplayWrapper.classList.remove("updating");
					this.valueDisplay.classList.remove("updating");
					this.updatePresets(endValue);
					this.updateAria();
					this.applyLive(endValue);
					resolve();
				}
			};
			this.rafId = requestAnimationFrame(step);
		});
	}

	updateThumbPosition(value) {
		const trackRect = this.track.getBoundingClientRect();
		this.thumb.style.left = `${(value / 100) * trackRect.width}px`;
	}

	updatePresets(value) {
		const target = `${Math.round(value)}%`;
		this.presets.forEach((btn) => btn.classList.toggle("active", btn.textContent === target));
	}

	updateAria() {
		this.track.setAttribute("aria-valuenow", Math.round(this.value));
	}

	bindEvents() {
		this.track.addEventListener("click", (e) => {
			if (e.target === this.thumb) return;
			const rect = this.track.getBoundingClientRect();
			const percent = ((e.clientX - rect.left) / rect.width) * 100;
			this.handleValueChange(percent);
		});

		this.track.addEventListener("pointerdown", (e) => this.startDrag(e));
		window.addEventListener("pointermove", (e) => this.drag(e));
		window.addEventListener("pointerup", () => this.endDrag());

		this.track.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				const delta = Math.sign(e.deltaY) * -this.scrollStep;
				this.setValueInstant(this.value + delta);
				this.saveAndApply(this.value);
			},
			{ passive: false }
		);

		this.track.addEventListener("keydown", (e) => {
			let delta = 0;
			switch (e.key) {
				case "ArrowRight":
				case "ArrowUp":
					delta = this.step;
					break;
				case "ArrowLeft":
				case "ArrowDown":
					delta = -this.step;
					break;
				case "Home":
					this.handleValueChange(this.min);
					return;
				case "End":
					this.handleValueChange(this.max);
					return;
				case "PageUp":
					delta = 10;
					break;
				case "PageDown":
					delta = -10;
					break;
				default:
					return;
			}
			e.preventDefault();
			this.handleValueChange(this.value + delta);
		});
	}

	startDrag(e) {
		if (e.button !== 0 && e.pointerType !== "touch") return;
		this.dragging = true;
		this.track.setPointerCapture(e.pointerId);
		this.track.classList.add("dragging");
		this.drag(e);
	}

	drag(e) {
		if (!this.dragging) return;
		const rect = this.track.getBoundingClientRect();
		const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
		this.setValueInstant(percent);
	}

	endDrag() {
		if (!this.dragging) return;
		this.dragging = false;
		this.track.classList.remove("dragging");
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.saveAndApply(this.value);
	}

	handleValueChange(targetValue) {
		const clamped = Math.max(this.min, Math.min(this.max, Math.round(targetValue / this.step) * this.step));
		if (clamped === this.value) return;
		this.setValueAnimated(clamped).then(() => this.saveAndApply(clamped));
	}

	applyLive(value) {
		if (currentTabId) applyBrightness(currentTabId, value);
	}

	async saveAndApply(value) {
		if (currentTabId) {
			await saveBrightness(currentTabId, value);
			await applyBrightness(currentTabId, value);
		}
	}
}

async function initialize() {
	const tab = await getCurrentTab();
	if (!tab) {
		console.error("No active tab found");
		return 100;
	}

	currentTabId = tab.id;
	console.log("Initializing for tab:", currentTabId);

	let brightness = await getPageBrightness(currentTabId);

	if (brightness === null) {
		console.log("Could not get page brightness, loading from storage");
		brightness = await loadBrightness(currentTabId);
		const applied = await applyBrightness(currentTabId, brightness);
		console.log("Initial brightness applied:", applied);
	} else {
		console.log("Got page brightness:", brightness);
		await saveBrightness(currentTabId, brightness);
	}

	return brightness;
}

document.addEventListener("DOMContentLoaded", async () => {
	console.log("Popup DOM loaded");

	const sliderTrack = document.getElementById("brightnessSlider");
	const valueDisplay = document.getElementById("brightnessValue");
	const resetBtn = document.getElementById("resetBtn");
	const presets = document.querySelectorAll(".preset-btn");

	if (!sliderTrack || !valueDisplay || !resetBtn || !presets.length) {
		console.error("Required DOM elements not found");
		return;
	}

	const initialBrightness = await initialize();

	const slider = new CustomSlider(sliderTrack, valueDisplay, presets, resetBtn);
	slider.setValueInstant(initialBrightness);

	presets.forEach((btn) => {
		btn.addEventListener("click", () => {
			const value = parseInt(btn.textContent);
			slider.handleValueChange(value);
			if (window.LightOffParticles) {
				const rect = btn.getBoundingClientRect();
				const canvas = document.getElementById("bg-particles");
				if (canvas) {
					const canvasRect = canvas.getBoundingClientRect();
					const x = rect.left - canvasRect.left + rect.width / 2;
					const y = rect.top - canvasRect.top + rect.height / 2;
					window.LightOffParticles.emitBurst(x, y, 20);
				}
			}
		});
	});

	resetBtn.addEventListener("click", () => {
		slider.handleValueChange(100);
	});
});
