// WiFi connectivity test for ESP32
// Upload this first to confirm WiFi works before running the full sensor code

#include <WiFi.h>

#include "secrets.h"

#define LED_BUILTIN 2

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=================================");
  Serial.println("WiFi Connectivity Test");
  Serial.println("=================================");
  Serial.print("Board: ESP32");
  Serial.println();
  Serial.print("Firmware SDK: ");
  Serial.println(ESP.getSdkVersion());
  Serial.print("Chip model: ");
  Serial.println(ESP.getChipModel());
  Serial.println();

  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  Serial.print("Password: ");
  Serial.println(strlen(WIFI_PASS) > 0 ? "********" : "(open network)");
  Serial.println();

  if (strlen(WIFI_SSID) == 0 || strcmp(WIFI_SSID, "your-wifi-ssid") == 0) {
    Serial.println("WARNING: WIFI_SSID is still the placeholder!");
    Serial.println("Edit secrets.h and set your actual WiFi SSID.");
    Serial.println();
  }

  Serial.print("Connecting");
  if (strlen(WIFI_PASS) > 0) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  } else {
    WiFi.begin(WIFI_SSID);
  }

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
    if (attempts > 40) {
      Serial.println();
      Serial.println("FAILED: WiFi did not connect within 20 seconds.");
      Serial.print("Status code: ");
      Serial.println(WiFi.status());
      Serial.println("  WL_CONNECTED    = 3");
      Serial.println("  WL_NO_SSID_AVAIL = 1");
      Serial.println("  WL_CONNECT_FAILED = 4");
      Serial.println("  WL_CONNECTION_LOST = 5");
      Serial.println("  WL_DISCONNECTED   = 6");
      Serial.println();
      Serial.println("Check your SSID, router, and that the ESP32 is in range.");
      Serial.println("Restart the board to try again.");
      digitalWrite(LED_BUILTIN, LOW);
      return;
    }
  }

  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println();
  Serial.println("CONNECTED!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal strength (RSSI): ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("DNS: ");
  Serial.println(WiFi.dnsIP());
  Serial.println();
  Serial.println("WiFi test PASSED. You can now upload the main sketch.");
  Serial.println("=================================");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected during test!");
  }
}
