'use client';
import { PiCellSignalNoneFill, PiCellSignalFullFill, PiCellSignalXFill } from 'react-icons/pi';

export default function WebSocketState({ connection }: { connection: number | undefined }) {
  switch (connection) {
    case 0:
      return <PiCellSignalNoneFill size={24} fill="gray" />;
    case 1:
      return <PiCellSignalFullFill size={24} fill="darkgreen" />;
    case 2:
      return <PiCellSignalXFill size={24} fill="darkred" />;
    case 3:
      return <PiCellSignalXFill size={24} fill="darkred" />;
    default:
      return <PiCellSignalNoneFill size={24} fill="gray" />;
  }
}
