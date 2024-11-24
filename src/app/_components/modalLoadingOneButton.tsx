import { RefObject } from 'react';

type modalProps = {
  isLoading: boolean;
  title_loading: string;
  title_done: string;
  body_loading: string;
  body_done: string;
  loadingButtonText: string;
  doneButtonText: string;
  ref: RefObject<HTMLDialogElement>;
  onClick?: () => void;
};

export default function DialogModalLoadingOneButton({
  isLoading,
  title_loading,
  title_done,
  body_loading,
  body_done,
  loadingButtonText,
  doneButtonText,
  ref,
  onClick,
}: modalProps) {
  return (
    <>
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{isLoading ? title_loading : title_done}</h3>
          <p className="py-4">{isLoading ? body_loading : body_done}</p>
          <div className="modal-action">
            <form
              method="dialog"
              onSubmit={(e) => {
                if (isLoading) {
                  e.preventDefault();
                }
              }}
            >
              <button className={`btn ${isLoading && 'btn-disabled'}`} onClick={onClick}>
                {isLoading ? loadingButtonText : doneButtonText}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
