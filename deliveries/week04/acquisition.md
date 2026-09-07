# Data Acquisition

Data is publicly available at OpenNeuro's GitHub repository.

``` {bash}
git clone https://github.com/OpenNeuroDatasets/ds004902
```

Copy from public S3 bucket to your local machine using the AWS CLI (~8GB).

``` {bash}
aws s3 sync --no-sign-request s3://openneuro.org/ds004902 C:\<your-path>\ds004902
```