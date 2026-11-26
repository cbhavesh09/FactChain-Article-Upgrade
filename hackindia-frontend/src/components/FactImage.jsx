import { useEffect, useState } from "react";
import { readImage } from "../ipfs";

export default function FactImage({ image }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let url;
    readImage(image, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setResult({ cid: image.cid, url });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ cid: image.cid });
    });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [image]);

  if (!image || result?.cid !== image.cid) return null;
  return result.url
    ? <img src={result.url} alt={image.alt || "Image attached to this fact"} className="mt-4 max-h-96 max-w-full rounded-lg object-contain" />
    : <p className="mt-2 text-stone-400">Image is unavailable from IPFS.</p>;
}

