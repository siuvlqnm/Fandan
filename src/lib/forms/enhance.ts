import { enhance } from '$app/forms';
import type { SubmitFunction } from '@sveltejs/kit';

type EnhanceWithFeedbackOptions = {
	confirmMessage?: string;
	pendingLabel?: string;
};

const submitButtons = (form: HTMLFormElement) =>
	Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])'));

export const enhanceWithFeedback = (
	form: HTMLFormElement,
	options: EnhanceWithFeedbackOptions = {}
) => {
	let currentOptions = options;

	const submit: SubmitFunction = ({ cancel, submitter }) => {
		const button = submitter instanceof HTMLButtonElement ? submitter : null;
		const confirmMessage = button?.dataset.confirm ?? currentOptions.confirmMessage;

		if (confirmMessage && !window.confirm(confirmMessage)) {
			cancel();
			return;
		}

		const buttons = submitButtons(form);
		const buttonStates = new Map<
			HTMLButtonElement,
			{ ariaBusy: string | null; disabled: boolean; markup: string | null }
		>();
		const pendingLabel = button?.dataset.pendingLabel ?? currentOptions.pendingLabel;

		for (const submitButton of buttons) {
			buttonStates.set(submitButton, {
				ariaBusy: submitButton.getAttribute('aria-busy'),
				disabled: submitButton.disabled,
				markup: null
			});
			submitButton.disabled = true;
			submitButton.setAttribute('aria-busy', 'true');
		}

		if (button && pendingLabel) {
			const state = buttonStates.get(button);

			if (state) {
				state.markup = button.innerHTML;
			}

			button.textContent = pendingLabel;
		}

		return async ({ update }) => {
			try {
				await update();
			} finally {
				for (const [submitButton, state] of buttonStates) {
					submitButton.disabled = state.disabled;

					if (state.ariaBusy) {
						submitButton.setAttribute('aria-busy', state.ariaBusy);
					} else {
						submitButton.removeAttribute('aria-busy');
					}

					if (state.markup !== null) {
						submitButton.innerHTML = state.markup;
					}
				}
			}
		};
	};

	const enhanced = enhance(form, submit);

	return {
		update(nextOptions: EnhanceWithFeedbackOptions = {}) {
			currentOptions = nextOptions;
		},
		destroy() {
			enhanced.destroy();
		}
	};
};
