import boto3
import os

ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = "eu-west-3"

def init_aws():
    print("Initialisation de l'infrastructure AWS Locale (Floci.io)...")
    
    # 1. S3 Bucket
    s3 = boto3.client('s3', endpoint_url=ENDPOINT_URL, region_name=REGION,
                      aws_access_key_id="test", aws_secret_access_key="test")
    try:
        s3.create_bucket(
            Bucket="bantuvoice-audios",
            CreateBucketConfiguration={'LocationConstraint': REGION}
        )
        print("Bucket S3 'bantuvoice-audios' créé avec succès.")
    except Exception as e:
        # Si le bucket existe déjà, il peut lever une erreur
        if "BucketAlreadyOwnedByYou" in str(e) or "BucketAlreadyExists" in str(e):
            print("Bucket S3 'bantuvoice-audios' existe déjà.")
        else:
            print(f"S3 Info/Error: {e}")

    # 2. DynamoDB Tables
    dynamodb = boto3.client('dynamodb', endpoint_url=ENDPOINT_URL, region_name=REGION,
                            aws_access_key_id="test", aws_secret_access_key="test")
    
    tables_to_create = [
        {
            "TableName": "Users",
            "KeySchema": [{"AttributeName": "username", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "username", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": "Audios",
            "KeySchema": [{"AttributeName": "audio_id", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "audio_id", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": "Segments",
            "KeySchema": [
                {"AttributeName": "audio_id", "KeyType": "HASH"},
                {"AttributeName": "segment_id", "KeyType": "RANGE"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "audio_id", "AttributeType": "S"},
                {"AttributeName": "segment_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        },
        {
            "TableName": "Languages",
            "KeySchema": [{"AttributeName": "code", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "code", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST"
        }
    ]

    for table in tables_to_create:
        try:
            dynamodb.create_table(**table)
            print(f"Table DynamoDB '{table['TableName']}' créée.")
        except Exception as e:
            if "ResourceInUseException" in str(e):
                print(f"Table DynamoDB '{table['TableName']}' existe déjà.")
            else:
                print(f"DynamoDB Error ({table['TableName']}): {e}")

if __name__ == "__main__":
    init_aws()
