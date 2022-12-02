// FIXME Kinda wanna add this to the routle repo in one big monorepo, then I can reuse this code

const withinRange = (flatLat1, flatLong1, flatLat2, flatLong2, distance) => {
  return (
    Math.sqrt(
      Math.pow(flatLat1 - flatLat2, 2) + Math.pow(flatLong1 - flatLong2, 2)
    ) <= distance
  );
};

export const getRandomCities = async (mapData) => {
  const path = `http://api.geonames.org/searchJSON?&featureClass=P&north=${mapData.latMax}&east=${mapData.longMax}&south=${mapData.latMin}&west=${mapData.longMin}&username=Daniel5055&orderby=population`;
  let pathWhole = path;
  let pathPart = path;

  mapData.countryCodes.whole?.forEach((cc) => (pathWhole += `&country=${cc}`));
  mapData.countryCodes.part?.forEach((part) => {
    pathPart += `&country=${part.country}`;

    // Notably currently only works for a single admin code?
    part.admin1?.forEach((region) => {
      pathPart += `&adminCode1=${region}`;
    });
    part.admin2?.forEach((region) => {
      pathPart += `&adminCode2=${region}`;
    });
  });

  const wholeResponse = mapData.countryCodes.whole
    ? fetch(pathWhole).then((res) => res.json())
    : { totalResultsCount: 0, geonames: [] };
  const partResponse = mapData.countryCodes.part
    ? fetch(pathPart).then((res) => res.json())
    : { totalResultsCount: 0, geonames: [] };
  const responses = await Promise.all([wholeResponse, partResponse]);

  const cities = responses
    .flatMap((response) => response.geonames)
    .sort((a, b) => b.population - a.population)
    .slice(0, 100);

  let startIndex = Math.floor(Math.random() * cities.length);
  let endIndex = Math.floor(Math.random() * cities.length);

  let startCityResponse = cities[startIndex];
  let endCityResponse = cities[endIndex];

  // Ensure its a good distance apart
  const minDist = (mapData.latMax - mapData.latMin) / 4;
  while (
    withinRange(
      startCityResponse.lat,
      startCityResponse.lng,
      endCityResponse.lat,
      endCityResponse.lng,
      minDist
    )
  ) {
    endIndex = Math.floor(Math.random() * cities.length);
    endCityResponse = cities[endIndex];
  }

  return [startIndex, endIndex, cities];
};
