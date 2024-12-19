import {
  WebsocketAnswerCreatedEvent,
  WebsocketAnswerDeletedEvent,
  WebsocketEvent,
  WebsocketNotificationEvent,
  WebsocketPayloadTypes,
  WebsocketQuestionCreatedEvent,
  WebsocketQuestionDeletedEvent,
} from '@/app/_dto/websocket-event/websocket-event.dto';
import { MyQuestionEv, AnswerEv, NotificationEv, MyProfileEv } from '@/app/main/_events';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';

type managerPropsType = {
  websocketRef: MutableRefObject<WebSocket | null>;
  toastTimeout: MutableRefObject<NodeJS.Timeout | undefined>;
  setWsState: Dispatch<SetStateAction<number | undefined>>;
  setQuestionsToastMenu: Dispatch<SetStateAction<boolean>>;
};

export const webSocketManager = (props: managerPropsType) => {
  const { websocketRef: websocket, toastTimeout, setWsState, setQuestionsToastMenu } = props;
  if (websocket.current) {
    websocket.current.close();
  }
  websocket.current = new WebSocket('/api/websocket');
  websocket.current.onmessage = (ws_event: MessageEvent) => {
    const ws_data = JSON.parse(ws_event.data) as WebsocketEvent<WebsocketPayloadTypes>;
    switch (ws_data.ev_name) {
      case 'question-created-event': {
        const data = ws_data as WebsocketQuestionCreatedEvent;
        console.debug('WS: 새로운 질문이 생겼어요!,', data.data);
        MyProfileEv.SendUpdateReq({ questions: data.data.question_numbers });
        MyQuestionEv.SendUpdateReq(data.data);
        toastTimeout.current = setTimeout(() => {
          setQuestionsToastMenu(false);
        }, 8000);
        setQuestionsToastMenu(true);
        break;
      }
      case 'question-deleted-event': {
        const data = ws_data as WebsocketQuestionDeletedEvent;
        console.debug('WS: 질문이 삭제되었어요!', data.data);
        MyProfileEv.SendUpdateReq({ questions: data.data.question_numbers });
        MyQuestionEv.SendDeleteReq(data.data);
        setQuestionsToastMenu(false);
        break;
      }
      case 'answer-created-event': {
        const data = ws_data as WebsocketAnswerCreatedEvent;
        AnswerEv.sendAnswerCreatedEvent(data.data);
        console.debug('WS: 새로운 답변이 생겼어요!', data.data);
        break;
      }
      case 'answer-deleted-event': {
        const data = ws_data as WebsocketAnswerDeletedEvent;
        AnswerEv.sendAnswerDeletedEvent(data.data);
        console.debug('WS: 답변이 삭제되었어요!', data.data);
        break;
      }
      case 'websocket-notification-event': {
        const data = ws_data as WebsocketNotificationEvent;
        switch (data.data.notification_name) {
          case 'answer_on_my_question': {
            console.debug('WS: 내 질문에 답변이 등록되었어요!', data.data.data);
            NotificationEv.sendNotificationEvent(data.data);
            break;
          }
          case 'read_all_notifications': {
            console.debug('WS: 모든 알림이 읽음처리 되었어요!', data.data);
            NotificationEv.sendNotificationEvent(data.data);
            break;
          }
          case 'delete_all_notifications': {
            console.debug('WS: 모든 알림이 삭제되었어요!', data.data);
            NotificationEv.sendNotificationEvent(data.data);
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
      case 'keep-alive': {
        break;
      }
    }
  };

  websocket.current.onopen = () => {
    console.debug('웹소켓이 열렸어요!');
    setWsState(websocket.current?.readyState);
  };
  websocket.current.onclose = (ev: CloseEvent) => {
    console.debug('웹소켓이 닫혔어요!', ev);
    setWsState(websocket.current?.readyState);
  };
  websocket.current.onerror = (ev: Event) => {
    console.log(`웹소켓 에러`, ev);
    setWsState(websocket.current?.readyState);
  };
};
