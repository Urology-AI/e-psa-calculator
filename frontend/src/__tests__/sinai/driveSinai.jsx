// Test helper (jsdom): mounts the Sinai app and answers every question.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SinaiApp from '../../sinai/SinaiApp.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setNumber(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

/**
 * @param {{age:number, heightFt:number, heightIn:number, weightLb:number,
 *          optionIndex?: number}} profile  optionIndex = which button to press in each option group
 * @returns {{container: HTMLElement, unmount: () => void}} the app, on its result screen
 */
export async function renderSinaiResult(profile = {}) {
  const { age = 61, heightFt = 5, heightIn = 10, weightLb = 187, optionIndex = 0 } = profile;
  window.scrollTo = () => {};
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(<SinaiApp />); });

  const primary = () => container.querySelector('.ms-btn--primary');
  await click(primary()); // intro -> form

  for (let step = 0; step < 4; step += 1) {
    if (step === 0) {
      const nums = container.querySelectorAll('input[type="number"]');
      await act(async () => {
        setNumber(nums[0], age);
        setNumber(nums[1], heightFt);
        setNumber(nums[2], heightIn);
        setNumber(nums[3], weightLb);
      });
    }
    for (const group of container.querySelectorAll('.ms-options')) {
      const buttons = group.querySelectorAll('button');
      await click(buttons[Math.min(optionIndex, buttons.length - 1)]);
    }
    await click(primary()); // Next / See my result
  }
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
