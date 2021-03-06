const got = require("got");
const cheerio = require("cheerio");
const { match: pathMatch } = require("path-to-regexp");

const ALLOWED_HOSTNAMES = [
  "dmm.co.jp",
  "ec.toranoana.jp",
  "ec.toranoana.shop",
  "melonbooks.co.jp",
  "order.mandarake.co.jp",
  "www.amazon.co.jp",
  "www.dmm.co.jp",
  "www.melonbooks.co.jp",
];

function scrapeTora(htmlString) {
  const $ = cheerio.load(htmlString);

  // Scrape Images
  const imageURLs = [];
  $("#thumbs .item").each(function() {
    imageURLs.push(
      $(this)
        .find("img")
        .data("src"),
    );
  });

  // Scrape Title
  const title = $(".product-info h1 span")
    .text()
    .trim();

  // Scrape Caption
  const circle =
    $(".sub-circle div").eq(1) != null
      ? $(".sub-circle div")
          .eq(1)
          .text()
          .trim()
      : "";
  const author =
    $(".sub-name div").eq(1) != null
      ? $(".sub-name div")
          .eq(1)
          .text()
          .trim()
      : "";
  const caption = [circle, author].filter(s => s.length > 0).join(" / ");

  return {
    imageURLs,
    title,
    caption,
  };
}

function scrapeMelon(htmlString) {
  const $ = cheerio.load(htmlString);

  // Scrape Images
  const imageURLs = [];
  $("#main .thumb").each(function() {
    const thumbnailURL = $(this)
      .find("img")
      .attr("src");
    imageURLs.push(
      `https:${thumbnailURL.slice(0, thumbnailURL.indexOf("&width"))}`,
    );
  });
  $("#thumbs .thumb").each(function() {
    const thumbnailURL = $(this)
      .find("img")
      .attr("src");
    imageURLs.push(
      `https:${thumbnailURL.slice(0, thumbnailURL.indexOf("&width"))}`,
    );
  });

  // Scrape Title
  const title = $("#title h1")
    .text()
    .trim();

  // Scrape Caption
  const circle =
    $("#description table tr").eq(1) != null
      ? $("#description table tr")
          .eq(1)
          .find("td a")
          .eq(0)
          .text()
          .trim()
      : "";
  const author =
    $("#description table tr").eq(1) != null
      ? $("#description table tr")
          .eq(2)
          .find("td a")
          .eq(0)
          .text()
          .trim()
      : "";
  const caption = [circle, author].filter(s => s.length > 0).join(" / ");

  return {
    imageURLs,
    title,
    caption,
  };
}

function scrapeMandarake(htmlString) {
  const $ = cheerio.load(htmlString);

  // Scrape Images
  const imageURLs = [];
  if ($(".xzoom-thumbs img").length > 0) {
    $(".xzoom-thumbs img").each(function() {
      imageURLs.push($(this).attr("src"));
    });
  } else {
    imageURLs.push($(".pic img").attr("src"));
  }

  // Scrape Title
  const title = $(".content_head h1")
    .text()
    .trim();

  // Scrape Caption
  const circle =
    $(".status table em").eq(0) != null
      ? $(".status table em")
          .eq(0)
          .text()
          .trim()
      : "";
  const author =
    $(".status table em").eq(1) != null
      ? $(".status table em")
          .eq(1)
          .text()
          .trim()
      : "";
  const caption = [circle, author].filter(s => s.length > 0).join(" / ");

  return {
    imageURLs,
    title,
    caption,
  };
}

function scrapeFanza(htmlString) {
  const $ = cheerio.load(htmlString);

  // Scrape Images
  const imageURLs = [];
  $(".productPreview__item img").each(function() {
    imageURLs.push($(this).data("src") || $(this).attr("src"));
  });

  // Scrape Title
  const title = $("h1.productTitle__txt")
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .trim();

  // Scrape Caption
  const caption = $(".circleName__txt")
    .text()
    .trim();

  return {
    imageURLs,
    title,
    caption,
  };
}

function scrapeAmazon(htmlString) {
  const $ = cheerio.load(htmlString);

  // Scrape Images
  let imageURLs = [];
  const scriptContent = $("#imageBlockOuter")
    .next()
    .html();
  if (scriptContent != null) {
    const match = scriptContent.match(/\[\{"mainUrl":(.*)\]/);
    if (match != null) {
      const imagesJSON = JSON.parse(match[0]);
      imageURLs = imagesJSON.map(image => image.mainUrl);
    } else {
      throw new Error(
        "Failed to extract thumbnail images for this Amazon book",
      );
    }
  } else {
    // Ebooks
    const ebookThumbnailURL = $("#ebooksImageBlock img").attr("src");
    imageURLs.push(ebookThumbnailURL);
  }

  // Scrape Title
  const title =
    $("#productTitle")
      .text()
      .trim() ||
    $("#ebooksProductTitle")
      .text()
      .trim();

  // Scrape Caption
  const caption =
    $("#bylineInfo > span > span > a")
      .eq(0)
      .text()
      .trim() ||
    $("#bylineInfo > span > a")
      .eq(0)
      .text()
      .trim();

  return {
    imageURLs,
    title,
    caption,
  };
}

exports.handler = async (event, context) => {
  const { httpMethod, queryStringParameters } = event;

  // Only allow GET
  if (httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Missing required query `url`
  const { bookURL } = queryStringParameters;
  if (bookURL == null) {
    return { statusCode: 400, body: "Missing query `bookURL`" };
  }

  try {
    const parsedBookURL = new URL(bookURL);
    if (!ALLOWED_HOSTNAMES.includes(parsedBookURL.hostname)) {
      return { statusCode: 400, body: "Book URL is not supported" };
    }

    let scrapedData = {};
    if (parsedBookURL.hostname.includes("toranoana")) {
      const response = await got(bookURL);
      scrapedData = scrapeTora(response.body);
    } else if (parsedBookURL.hostname.includes("melonbooks")) {
      parsedBookURL.searchParams.set("adult_view", "1");
      const response = await got(parsedBookURL.href, {
        headers: {
          cookie: "AUTH_ADULT=1",
        },
      });
      scrapedData = scrapeMelon(response.body);
    } else if (parsedBookURL.hostname.includes("mandarake")) {
      const response = await got(bookURL);
      scrapedData = scrapeMandarake(response.body);
    } else if (parsedBookURL.hostname.includes("dmm")) {
      const response = await got(bookURL);
      scrapedData = scrapeFanza(response.body);
    } else if (parsedBookURL.hostname.includes("amazon")) {
      const productPathMatch = pathMatch("/dp/:bookID", {
        decode: decodeURIComponent,
      });
      const altProductPathMatch = pathMatch("/gp/product/:bookID", {
        decode: decodeURIComponent,
      });
      const match =
        productPathMatch(parsedBookURL.pathname) ||
        altProductPathMatch(parsedBookURL.pathname);
      if (match == null) {
        throw new Error(
          "Amazon URL is not a product URL path i.e /dp/:productID",
        );
      }
      const {
        params: { bookID },
      } = match;
      const response = await got(
        `https://www.amazon.co.jp/gp/product/black-curtain-redirect.html/000-0000000-0000000?redirectUrl=%2Fgp%2Fproduct%2F${bookID}`,
      );
      scrapedData = scrapeAmazon(response.body);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: bookURL,
        ...scrapedData,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: "Something wrong happened",
    };
  }
};
