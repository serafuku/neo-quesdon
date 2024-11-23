import { RefObject } from "react";

type modalProps = {
  title: string;
  body: string;
  buttonText: string;
  ref: RefObject<HTMLDialogElement>;
};

export default function DialogModalOneButton({
  title,
  body,
  buttonText,
  ref,
}: modalProps) {
  return (
    <>
      <dialog ref={ref} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="py-4">{body}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">{buttonText}</button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
