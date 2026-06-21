import paho.mqtt.client  as mqtt
from app.mqtt.handler import handle_message
from dotenv import load_dotenv
import os

load_dotenv()

HOST = os.getenv("MQTT_HOST")
PORT = int(os.getenv("MQTT_PORT"))
TOPIC = os.getenv("MQTT_TOPIC")

USERNAME= os.getenv("MQTT_USERNAME")
PASSWORD = os.getenv("MQTT_PASSWORD")

def on_connect(client, userdata, flags,rc ): 
    print("MQTT connected",rc)
    client.subscribe(TOPIC) 

def on_message(client, userdata,msg):
    handle_message(msg)

def start_mqtt():
    client=mqtt.Client()

    client.username_pw_set(USERNAME,PASSWORD)

    client.tls_set()

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(HOST,PORT,60)
    client.loop_forever()