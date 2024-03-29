import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { resolve } from 'path'
import { rejects } from 'assert'

const storage = new Storage()

const rawVideoNameBucketName = "ch-yt-raw-videos"
const processedVideoBucketName = "ch-yt-processed-videos"

const localRawVideoPath = "./raw-videos"
const localProcessedVideoPath = "./processed-video"

export function setupDirectories() {
    ensureDirectoryExistence(localRawVideoPath)
    ensureDirectoryExistence(localProcessedVideoPath)
}

export function convertVideo(rawVideoName: string, processedVideoName: string) {
    return new Promise<void>((resolve, reject) => {
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOption("-vf", "scale=-1:360") //360p
        .on("end", () => {
            console.log("Video completed processing")
            resolve()
        })
        .on("error", (err) => {
            console.log(`An error occured: ${err.message}`)
            reject(err)
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`)
    })
}

export async function downloadRawVideos(fileName: string) {
    await storage.bucket(rawVideoNameBucketName)
    .file(fileName)
    .download({destination: `${localRawVideoPath}/${fileName}`})

    console.log(
        `gs://${rawVideoNameBucketName}/${fileName} downloaded to ${localProcessedVideoPath}/${fileName}.`
    )
}

export async function uploadProcessedVideos(fileName: string) {
    
    await storage.bucket(processedVideoBucketName)
    .upload(`${localProcessedVideoPath}/${fileName}`, {
        destination: fileName
    })

    await storage.bucket(processedVideoBucketName)
    .file(fileName)
    .makePublic()
}

export function deleteRawVideo(fileName: string) {
    return deleteFile(`${localRawVideoPath}/${fileName}`)
}

export function deleteProcessedVideo(fileName: string) {
    return deleteFile(`${localProcessedVideoPath}/${fileName}`)
}

function deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if(fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if(err) {
                    console.log(`Failed to delete file at ${filePath}`, err)
                    reject(err)
                } else {
                    resolve()
                }
            })
        } else {
            reject(`File ${filePath} does not exist.`)
        }
    })
}

function ensureDirectoryExistence(dirPath: string) {
    if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true})
        console.log(`Directory created at ${dirPath}`)
    }
}