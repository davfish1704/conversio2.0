#!/bin/bash
TOKEN="EAAYPZCWJONyoBRaTPQkYBaTmqKLtN8VvkkZC3f1ruLmZAOBw6DGDAJtGzTT8H9wNOaceJaZBZAqABwTGllouypHTrFAQg1j50F9TXsLiBPeyWAY77yqJSeZCpDhZBEhNsCnSCKX6VrBBvU5rx4ZCShHbswWxkUSC3gREHUaKH8uFLZCg0kLze3hqkIGZCqZCOLiD8D2kBCTDbmEi1MMWmd6L4zcVYYM0x6gMKFsNspppsgKhDPH8ZBgGWuINbc1SzeAM1Cj5bEQlTpQ8QqtgxLlkRnKDPlJrRhcyKKuyaBMzO4ZAmhwZDZD"
PHONE_ID="1119643897890269"
TO_NUMBER="4915731329868"

curl -X POST "https://graph.instagram.com/v18.0/${PHONE_ID}/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"messaging_product\": \"whatsapp\", \"to\": \"${TO_NUMBER}\", \"type\": \"text\", \"text\": {\"body\": \"Test\"}}"
