import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import { MyError } from '../utils/error.js'
config()

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const bucketName = 'gac-snapshots'

export async function uploadSnapshot(buffer, key, bucket=bucketName) {
    try {
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: 'image/webp'
            })
        )

        return `https://${bucket}.s3.amazonaws.com/${key}`
    } catch(err) {
        console.error("S3 upload failed", {
            name: err.name,
            message: err.message,
            code: err.$metadata?.httpStatusCode,
            requestId: err.$metadata?.requestId
        })

        throw new MyError(400, 'Failed to upload snapshot to S3', err)
    }
}

export async function getImageFromS3(key, bucket=bucketName) {
    const url = `https://${bucket}.s3.amazonaws.com/${key}`
    const response = await fetch(url)
    if(!response.ok) {
        throw new MyError(`Failed to fetch image: ${key}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer
}