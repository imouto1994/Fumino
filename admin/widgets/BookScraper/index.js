import React, { forwardRef, useCallback } from "react";
import { fromJS } from "immutable";

import styles from "./styles.css";

const ALLOWED_HOSTNAMES = ["ec.toranoana.jp"];

const BookScraper = forwardRef((props, ref) => {
  const { value, onChange } = props;
  const url = value != null ? value.get("url") : "";
  const imageURL = value != null ? value.get("imageURL") : "";

  const onInputChange = useCallback(
    e => {
      const updateURL = e.target.value;
      let hostname;
      try {
        hostname = new URL(updateURL).hostname;
      } catch (error) {
        // Fail silently
        console.log("Failed to parse URL:", updateURL);
        return;
      }

      if (!ALLOWED_HOSTNAMES.includes(hostname)) {
        return;
      }
      fetch(
        `/.netlify/functions/scrape?bookURL=${encodeURIComponent(updateURL)}`,
      )
        .then(response => response.json())
        .then(body => {
          const { title, imageURL, url, caption } = body;
          const img = new Image();
          img.onload = function() {
            onChange(
              fromJS({
                title,
                imageURL,
                url,
                caption,
                imageWidth: this.width,
                imageHeight: this.height,
              }),
            );
          };
          img.src = imageURL;
        })
        .catch(error => console.error(error));
    },
    [onChange],
  );

  return (
    <>
      <input
        ref={ref}
        type="text"
        defaultValue={url}
        className={styles.input}
        onChange={onInputChange}
      />
      <img src={imageURL} className={styles.field} />
    </>
  );
});

export default BookScraper;
