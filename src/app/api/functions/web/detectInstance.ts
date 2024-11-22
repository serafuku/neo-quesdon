import { Logger } from "@/utils/logger/Logger";

type nodeinfoMeta = {
  links: nodeinfoVersionList[];
};

type nodeinfoVersionList = {
  rel: string;
  href: string;
};

type nodeinfo = {
  version: string;
  software: { name: string; version: string };
};

const logger = new Logger('detectInstance');
export default async function detectInstance(host: string) {
  const parsedUrl = new URL(`https://${host}`);
  const nodeInfoMeta: nodeinfoMeta = await fetch(
    `${parsedUrl.origin}/.well-known/nodeinfo`
  ).then((r) => {
    if (!r.ok) {
      logger.error('인스턴스 타입 감지 실패 ', r.status);
      throw new Error('인스턴스 타입 감지 실패');
    }
    return r.json();
  }
  );
  const nodeInfoLink = nodeInfoMeta.links.find(
    (el) => el.rel === "http://nodeinfo.diaspora.software/ns/schema/2.0"
  );

  const nodeInfo: nodeinfo = await fetch(`${nodeInfoLink?.href}`).then((r) => {
    if (!r.ok) {
      logger.error('인스턴스 타입 감지 실패 ', r.status);
      throw new Error('인스턴스 타입 감지 실패');
    }
    return r.json();
  }
  );

  return nodeInfo.software.name;
}
