'use client';

import CollapseMenu from '@/app/_components/collapseMenu';
import DialogModalLoadingOneButton from '@/app/_components/modalLoadingOneButton';
import DialogModalTwoButton from '@/app/_components/modalTwoButton';
import { Block, DeleteBlockByIdDto, GetBlockListReqDto, GetBlockListResDto } from '@/app/_dto/blocking/blocking.dto';
import { useEffect, useRef, useState } from 'react';

export default function BlockList() {
  const [untilId, setUntilId] = useState<string | null>(null);
  const [blockList, setBlockList] = useState<Block[]>([]);
  const [unblockId, setUnblockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<HTMLTableRowElement | null>(null);
  const [loadingDoneModalText, setLoadingDoneModalText] = useState<{ title: string; body: string }>({
    title: '완료',
    body: '차단 해제되었어요!',
  });
  const unblockConfirmModalRef = useRef<HTMLDialogElement>(null);
  const unblockSuccessModalRef = useRef<HTMLDialogElement>(null);

  const doUnBlock = async (id: string) => {
    setIsLoading(true);
    unblockSuccessModalRef.current?.showModal();
    const data: DeleteBlockByIdDto = { targetId: id };
    const res = await fetch('/api/user/blocking/delete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setIsLoading(false);
      setLoadingDoneModalText({
        title: '오류',
        body: `차단 해제중 오류가 발생했어요! ${await res.text()}`,
      });
      return;
    }
    setBlockList((prevList) => (prevList ? [...prevList.filter((prev) => prev.id !== id)] : []));
    setIsLoading(false);
  };

  const fetchBlocklist = async (req: GetBlockListReqDto): Promise<Block[]> => {
    const res = await fetch('/api/user/blocking/list', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    try {
      if (res.ok) {
        const blocklist = ((await res.json()) as GetBlockListResDto).blockList;
        return blocklist;
      } else {
        throw new Error('차단 리스트를 불러오는데 에러가 발생했어요!');
      }
    } catch (err) {
      alert(err);
      throw err;
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          fetchBlocklist({ limit: 30, ...(untilId ? { untilId: untilId } : {}), sort: 'DESC' }).then((list) => {
            if (list.length === 0) {
              setIsLoading(false);
              return;
            }
            setBlockList((prevlist) => [...prevlist, ...list]);
            setUntilId(list[list.length - 1].id);
          });
        }
      },
      { threshold: 0.7 },
    );
    if (mounted) observer.observe(mounted);
    return () => {
      if (mounted) observer.unobserve(mounted);
    };
  }, [mounted, untilId]);

  return (
    <>
      <CollapseMenu id={'blockList'} text="차단한 사용자 보기">
        <table className="table">
          <thead>
            <tr>
              <th className="text-sm dark:text-white">유저 핸들</th>
            </tr>
          </thead>
          <tbody>
            {blockList.map((el) => (
              <tr key={el.id}>
                <td className="break-all">{el.targetHandle}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm w-full break-keep"
                    onClick={() => {
                      setUnblockId(el.id);
                      unblockConfirmModalRef.current?.showModal();
                    }}
                  >
                    차단 해제
                  </button>
                </td>
              </tr>
            ))}
            <tr ref={(ref) => setMounted(ref)}>
              {isLoading ? (
                <td>
                  <span className="loading loading-spinner" />
                </td>
              ) : (
                <>
                  {blockList.length === 0 ? (
                    <>
                      <td>
                        <span className="text-lg">차단한 유저가 없어요!</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <span className="text-lg">끝!</span>
                      </td>
                    </>
                  )}
                </>
              )}
            </tr>
          </tbody>
        </table>
      </CollapseMenu>
      <DialogModalTwoButton
        title={'차단 해제'}
        body={'차단 해제하시겠어요?'}
        confirmButtonText={'확인'}
        onClick={() => doUnBlock(unblockId!)}
        cancelButtonText={'취소'}
        ref={unblockConfirmModalRef}
      />
      <DialogModalLoadingOneButton
        isLoading={isLoading}
        title_loading={'차단 해제'}
        title_done={loadingDoneModalText.title}
        body_loading={'차단 해제하는 중...'}
        body_done={loadingDoneModalText.body}
        loadingButtonText={'로딩중'}
        doneButtonText={'닫기'}
        ref={unblockSuccessModalRef}
      />
    </>
  );
}
