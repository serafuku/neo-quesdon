import { RefObject } from 'react';

type modalProps = {
  title: string;
  body: string;
  confirmButtonText: string;
  cancelButtonText: string;
  ref: RefObject<HTMLDialogElement>;
  onClick?: () => void;
};

export default function DialogModalTwoButton({
  title,
  body,
  confirmButtonText,
  cancelButtonText,
  ref,
  onClick,
}: modalProps) {
  return (
    <>
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="py-4 whitespace-pre-line">{body}</p>
          <div className="modal-action">
            <form method="dialog">
              <div className="flex gap-2">
                <button className="btn btn-error" onClick={onClick}>
                  {confirmButtonText}
                </button>
                <button className="btn">{cancelButtonText}</button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
