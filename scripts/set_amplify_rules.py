import boto3

client = boto3.client("amplify", region_name="us-east-1")

rules = [
    {
        "source": "/<*>",
        "target": "/index.html",
        "status": "404-200"
    }
]

res = client.update_app(
    appId="dpd7m9jmuhh6w",
    customRules=rules
)

print("Updated Amplify custom rules:")
for rule in res["app"]["customRules"]:
    print(rule)
