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

export default async function detectInstance(host: string) {
  const parsedUrl = new URL(`https://${host}`);
  const nodeInfoMeta: nodeinfoMeta = await fetch(
    `${parsedUrl.origin}/.well-known/nodeinfo`
  ).then((r) => r.json());
  const nodeInfoLink = nodeInfoMeta.links.find(
    (el) => el.rel === "http://nodeinfo.diaspora.software/ns/schema/2.0"
  );

  const nodeInfo: nodeinfo = await fetch(`${nodeInfoLink?.href}`).then((r) =>
    r.json()
  );

  return nodeInfo.software.name;
}
