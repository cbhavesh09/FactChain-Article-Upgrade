import { useState } from "react";
import FactImage from "./FactImage";

const tajPhotos = [
  {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Taj_Mahal%2C_Agra%2C_January_2012.jpg/960px-Taj_Mahal%2C_Agra%2C_January_2012.jpg",
    alt: "Front view of the Taj Mahal in Agra",
    credit: "Leon Yaakov · CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Taj_Mahal,_Agra,_January_2012.jpg",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/43/Taj_Mahal_Main_monument_and_it%27s_lawns.JPG",
    alt: "The Taj Mahal and its lawns",
    credit: "Rananishant · CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_Main_monument_and_it%27s_lawns.JPG",
  },
];

export function answerImages(articles, query) {
  const images = [];
  const seen = new Set();
  for (const article of articles) {
    const image = article.image;
    if (image && !seen.has(image.cid)) {
      seen.add(image.cid);
      images.push({ ...image, alt: image.alt || article.title });
    }
  }
  if (/\btaj\s*mahal\b/i.test(query) && articles.some(article => /\btaj\s*mahal\b/i.test(article.title))) {
    images.push(...tajPhotos);
  }
  return images;
}

function GalleryImage({ image }) {
  const [failed, setFailed] = useState(false);
  if (!image.url) return <FactImage image={image} />;
  return (
    <figure>
      {failed ? <p className="text-sm text-stone-400">Preview unavailable.</p> :
        <img src={image.url} onError={() => setFailed(true)} alt={image.alt} className="aspect-[4/3] w-full rounded-lg object-contain bg-black" referrerPolicy="no-referrer" />}
      <figcaption className="mt-1 text-xs text-stone-400"><a href={image.source} target="_blank" rel="noreferrer" className="underline">{image.credit}</a></figcaption>
    </figure>
  );
}

export default function AnswerGallery({ images }) {
  const [open, setOpen] = useState(false);
  const [main, ...extra] = images;
  const keyFor = image => image.cid || image.url;
  return (
    <aside aria-label="Related images" className="min-w-0 rounded-xl border border-stone-800 bg-stone-950 p-3">
      <h2 className="mb-2 text-sm font-semibold text-amber-300">Related images</h2>
      <GalleryImage key={keyFor(main)} image={main} />
      {extra.length > 0 && (
        <details className="mt-3 border-t border-stone-800 pt-2" onToggle={event => setOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-amber-200">{open ? "Hide additional images" : `Show ${extra.length} more ${extra.length === 1 ? "image" : "images"}`}</summary>
          {open && <div className="mt-2 grid gap-3">{extra.map(image => <GalleryImage key={keyFor(image)} image={image} />)}</div>}
        </details>
      )}
    </aside>
  );
}



