import axios from "axios";

// Digiflazz API endpoint & credentials from env
const DIGIFLAZZ_URL = "https://api.digiflazz.com/v1/price-list";
const API_KEY = process.env.DIGIFLAZZ_API_KEY;
const USERNAME = process.env.DIGIFLAZZ_USERNAME;

export async function getProducts() {
  // Example payload for Digiflazz price list
  const payload = {
    cmd: "prepaid",
    username: USERNAME,
    sign: "dummy-signature", // TODO: generate SHA256(username+api_key+cmd)
  };
  // For demo, return static products
  return [
    { code: "ml", name: "Mobile Legends", icon: "/ml.png", price: 10000 },
    { code: "ff", name: "Free Fire", icon: "/ff.png", price: 12000 },
    { code: "pubgm", name: "PUBG Mobile", icon: "/pubgm.png", price: 15000 },
    { code: "valo", name: "Valorant", icon: "/valo.png", price: 20000 },
    { code: "genshin", name: "Genshin Impact", icon: "/genshin.png", price: 25000 },
    // ...add more as needed
  ];
  // Uncomment below for real API call
  // const res = await axios.post(DIGIFLAZZ_URL, payload);
  // return res.data.data;
}
