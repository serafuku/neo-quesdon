'use client';

import { RefObject } from 'react';

type modalProps = {
  title: string;
  body: string;
  buttonText: string;
  ref: RefObject<HTMLDialogElement>;
  onClick?: () => void;
  onClose?: () => void;
};

export default function DialogModalOneButton({ title, body, buttonText, ref, onClick, onClose }: modalProps) {
  return (
    <>
      <dialog ref={ref} className="modal" onClose={onClose}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="py-4">{body}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={onClick}>
                {buttonText}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
