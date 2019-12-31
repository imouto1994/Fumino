import React, { ReactElement } from "react";
import { Helmet } from "react-helmet-async";

import CardBookList from "../CardBookList";
import mangaBooks from "../../../json/manga.json";

export default function PageManga(): ReactElement<void> {
  const { books } = mangaBooks;

  return (
    <>
      <Helmet>
        <title>Manga Wishlist</title>
        <link rel="canonical" href="https://wishlist.noobsaigon.com/m" />
      </Helmet>
      <CardBookList books={books} cardThumbnailRatio={1.5} />
    </>
  );
}
