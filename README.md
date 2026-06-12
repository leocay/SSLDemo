# LocalHttpHttpsDemo

Demo ASP.NET Core co 2 trang localhost:

- HTTP: `http://localhost:5080/login`
- HTTPS: `https://localhost:5443/login`

Ca hai trang dung chung mot form `POST /login` de ban bat request bang Chrome DevTools, HTTP Toolkit, Wireshark, Burp Suite, hoac proxy khac.

## Chay demo

Tu thu muc `D:\LINH\DEV\Discovery\SSL_TLS`:

```powershell
.\LocalHttpHttpsDemo\run-node-demo.ps1
```

Sau khi server chay, mo:

```text
http://localhost:5080/login
https://localhost:5443/login
```

Trang HTTPS dung file certificate `.pfx` trong `LocalHttpHttpsDemo\certs`. Neu file nay bi xoa, tao lai bang:

```powershell
dotnet dev-certs https -ep .\LocalHttpHttpsDemo\certs\localhost-demo.pfx -p localhost-demo
```

Neu Chrome hien trang canh bao `Your connection is not private`, bam `Advanced` -> `Proceed to localhost`.

Neu thay `ERR_CONNECTION_CLOSED` o cong 5443, hay mo day du `https://localhost:5443/login` thay vi `localhost:5443/login`.

Neu muon trust certificate de Chrome khong canh bao:

```powershell
dotnet dev-certs https --trust
```

## Bat bang HTTP Toolkit

Duoc. Cach de thay request ro nhat:

1. Mo HTTP Toolkit.
2. Vao tab `Intercept`.
3. Bam `Chrome` de HTTP Toolkit mo mot Chrome profile rieng.
4. Trong Chrome do, mo `http://localhost:5080/login`, gui form.
5. Quay lai HTTP Toolkit tab `View`, chon request `POST /login`.
6. Mo tiep `https://localhost:5443/login`, gui form, roi xem request `POST /login`.

Ket qua can quan sat:

- HTTP: HTTP Toolkit thay request/body dang ro hon, vi du `username=linh&password=123456`.
- HTTPS: HTTP Toolkit chi doc duoc body neu Chrome dang di qua proxy cua HTTP Toolkit va tin certificate cua HTTP Toolkit.
- Neu dung Chrome thuong khong duoc HTTP Toolkit intercept, ban co the khong thay request trong HTTP Toolkit.

## DevTools va HTTP Toolkit khac nhau the nao?

- Chrome DevTools nam ben trong trinh duyet, nen no van thay payload HTTPS sau khi Chrome da giai ma TLS.
- HTTP Toolkit nam giua duong truyen theo kieu proxy. Voi HTTP thi thay ngay clear text. Voi HTTPS, no phai tao TLS interception bang certificate rieng thi moi xem duoc noi dung.

Tai lieu HTTP Toolkit: https://httptoolkit.com/docs/getting-started/intercepting/
