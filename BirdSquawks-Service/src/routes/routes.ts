import express, { Request, Response } from 'express';
const amqp = require('amqplib');
import BirdSquawkModel from '../models/bidsquawk';

const { randomBytes } = require('crypto');

const router = express.Router();

router.get('/api/birdsquawk', (req: Request, res: Response) => {
    BirdSquawkModel.find({}, (err: any, birdsquawk: any) => {
        if (err) {
            res.send(err);
        }
        res.status(200).json(birdsquawk);
    });
});

router.post('/api/birdsquawk', async (req: Request, res: Response) => {
    const { squawk } = req.body;
    const squawkId = randomBytes(4).toString('hex');
    const squawkData = { squawk, squawkId };
    try {
        const newBirdSquawk = new BirdSquawkModel(squawkData);
        await newBirdSquawk.save();
        console.log("Saved BirdSquawk to DB");

        const connection = await amqp.connect("amqp://rabbitmq-service:5672");
        console.log("Connected to RabbitMQ");
        const channel = await connection.createChannel();
        console.log("Created RabbitMQ channel");
        await channel.assertExchange("birdsquawk", "topic", { durable: false });
        console.log("Asserted RabbitMQ exchange");
        await channel.publish("birdsquawk", "squawk", Buffer.from(JSON.stringify(squawkData)));
        console.log("Published to RabbitMQ");
        res.status(201).send(squawkData);

    } catch (err) {
        res.status(500).send(err);
    }
});

export { router };