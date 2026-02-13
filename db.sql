--
-- PostgreSQL database dump
--

\restrict ZAvbrhcwFiVKnbIqYxWIApzWUHwt2LibcRb3Nsg3bEqZKCoIPcjmIkRubcdt22l

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 18.0

-- Started on 2026-02-13 13:33:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16385)
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- TOC entry 3782 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- TOC entry 1054 (class 1247 OID 17042)
-- Name: booking_status; Type: TYPE; Schema: public; Owner: campus_user
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'canceled',
    'completed'
);


ALTER TYPE public.booking_status OWNER TO campus_user;

--
-- TOC entry 1051 (class 1247 OID 17036)
-- Name: user_role; Type: TYPE; Schema: public; Owner: campus_user
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin'
);


ALTER TYPE public.user_role OWNER TO campus_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 17078)
-- Name: bookings; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    facility_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    purpose text DEFAULT 'Kegiatan Mahasiswa'::text,
    ticket_code character varying(255),
    is_checked_in boolean DEFAULT false,
    checked_in_at timestamp with time zone,
    is_checked_out boolean DEFAULT false,
    checked_out_at timestamp with time zone,
    checkout_status character varying(20),
    actual_end_time timestamp with time zone,
    attendance_status character varying(20),
    review_comment text,
    reviewed_at timestamp with time zone,
    CONSTRAINT bookings_check CHECK ((start_time < end_time))
);


ALTER TABLE public.bookings OWNER TO campus_user;

--
-- TOC entry 3783 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.checkout_status; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.checkout_status IS 'on_time = tepat waktu, late = terlambat';


--
-- TOC entry 3784 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.actual_end_time; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.actual_end_time IS 'Waktu aktual user scan check-out atau auto check-out sistem';


--
-- TOC entry 3785 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.attendance_status; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.attendance_status IS 'on_time = tepat waktu, late = terlambat, no_show = mangkir';


--
-- TOC entry 3786 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.review_comment; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.review_comment IS 'Komentar ulasan dari user terkait fasilitas setelah status completed';


--
-- TOC entry 3787 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN bookings.reviewed_at; Type: COMMENT; Schema: public; Owner: campus_user
--

COMMENT ON COLUMN public.bookings.reviewed_at IS 'Waktu saat user memberikan atau memperbarui ulasan';


--
-- TOC entry 217 (class 1259 OID 17064)
-- Name: facilities; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    capacity integer NOT NULL,
    price numeric(12,2),
    photo_url text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    description text,
    location character varying(255),
    CONSTRAINT facilities_capacity_check CHECK ((capacity > 0))
);


ALTER TABLE public.facilities OWNER TO campus_user;

--
-- TOC entry 219 (class 1259 OID 41680)
-- Name: profiles; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name character varying(150),
    phone_number character varying(20),
    address text,
    avatar_url text,
    gender character varying(1),
    identity_number character varying(50),
    department character varying(100),
    "position" character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['L'::character varying, 'P'::character varying])::text[])))
);


ALTER TABLE public.profiles OWNER TO campus_user;

--
-- TOC entry 216 (class 1259 OID 17051)
-- Name: users; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_by uuid,
    deleted_at timestamp with time zone,
    phone character varying(100),
    is_phone_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO campus_user;

--
-- TOC entry 220 (class 1259 OID 99024)
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: campus_user
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(20) NOT NULL,
    code character varying(10) NOT NULL,
    type character varying(20) NOT NULL,
    expiration_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


ALTER TABLE public.verification_codes OWNER TO campus_user;

--
-- TOC entry 3774 (class 0 OID 17078)
-- Dependencies: 218
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.bookings (id, user_id, facility_id, start_time, end_time, status, rejection_reason, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, purpose, ticket_code, is_checked_in, checked_in_at, is_checked_out, checked_out_at, checkout_status, actual_end_time, attendance_status, review_comment, reviewed_at) FROM stdin;
7580b70c-cc6e-46db-8710-09a191399f68	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 05:42:00+00	2026-02-09 06:54:00+00	rejected	\N	2026-02-09 03:42:41.90264+00	2026-02-09 03:42:50.664046+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
2176a157-4441-4a4e-9a5f-b593e121566e	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 03:31:00+00	2026-02-09 04:43:00+00	rejected	\N	2026-02-09 03:34:29.154464+00	2026-02-09 03:42:53.226322+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
b45fefa3-6e47-4a50-8741-ea6eaab5ecf1	d6d3afe9-3199-4753-8d85-cfd47270d1eb	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 05:36:00+00	2026-02-09 06:47:00+00	canceled	User Account Deleted	2026-02-09 03:34:51.943364+00	2026-02-09 03:35:27.639591+00	d6d3afe9-3199-4753-8d85-cfd47270d1eb	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
5b569896-281f-4b4a-880e-c8129d67e556	a10e69c6-260a-4e38-b98e-ce1a091d7917	8b6dd75a-f94d-4088-b6a1-c8595273fcc7	2026-02-09 03:45:00+00	2026-02-09 04:56:00+00	canceled	\N	2026-02-09 03:45:45.360526+00	2026-02-09 04:00:17.657903+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	a10e69c6-260a-4e38-b98e-ce1a091d7917	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
8eddc8d3-29a6-404b-a710-c7e9a501f778	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 04:01:00+00	2026-02-09 05:11:00+00	completed	\N	2026-02-09 04:01:21.66091+00	2026-02-09 04:01:28.597264+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260209-Z4A0N	t	2026-02-09 04:08:06.17128+00	t	2026-02-09 04:08:31.052958+00	\N	2026-02-09 04:08:31.052958+00	on_time	gg\n	2026-02-09 04:09:36.856638+00
e94e119d-bc3e-4e07-96cf-606e712cccfa	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-07 18:00:00+00	2026-02-08 16:10:00+00	completed	\N	2026-02-09 04:18:42.464472+00	2026-02-09 09:06:10.243047+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260209-Z2J5C	f	\N	f	\N	\N	2026-02-08 16:10:00+00	no_show	\N	\N
05b87b08-73f6-4987-9990-53fe63e30641	cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-10 04:10:00+00	2026-02-10 05:10:00+00	rejected	\N	2026-02-09 04:23:23.207833+00	2026-02-10 04:01:23.958386+00	cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
1249fe3c-0f1c-43ba-8fd8-a03e1519c653	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-10 03:00:00+00	2026-02-10 04:10:00+00	rejected	\N	2026-02-09 04:14:55.59975+00	2026-02-10 04:01:26.459527+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
91259b8e-501e-4dd3-b43c-572ca68ca4dd	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-09 04:05:00+00	2026-02-09 05:16:00+00	completed	\N	2026-02-10 04:05:05.456858+00	2026-02-10 04:05:13.235737+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260210-YHV2K	f	\N	f	\N	\N	2026-02-09 05:16:00+00	no_show	\N	\N
14be3a58-15b7-4998-bbfb-3b91556f1aee	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-10 04:01:00+00	2026-02-10 05:12:00+00	completed	\N	2026-02-10 04:01:44.622816+00	2026-02-10 04:01:53.851286+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260210-S6U4I	t	2026-02-10 04:03:09.915629+00	t	2026-02-10 05:12:21.01331+00	\N	2026-02-10 05:12:21.01331+00	late	\N	\N
f3ad7239-4fb5-46ee-8ed4-a0d457aa88de	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-11 04:03:00+00	2026-02-11 05:14:00+00	completed	\N	2026-02-10 04:03:55.301388+00	2026-02-10 04:04:02.186063+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260210-BUHYD	f	\N	f	\N	\N	2026-02-11 05:14:00+00	no_show	\N	\N
b4aaadb9-cf53-466e-8b1f-f77179660598	a10e69c6-260a-4e38-b98e-ce1a091d7917	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-13 03:53:00+00	2026-02-13 05:04:00+00	pending	\N	2026-02-13 03:54:09.975686+00	2026-02-13 03:54:09.975686+00	a10e69c6-260a-4e38-b98e-ce1a091d7917	\N	\N	\N		\N	f	\N	f	\N	\N	\N	\N	\N	\N
f85910f6-406f-44ca-8981-6953658cf7a3	cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	d76ca801-d61a-492e-9a91-09a6053eec40	2026-02-13 03:49:00+00	2026-02-13 05:00:00+00	completed	\N	2026-02-13 03:49:51.034487+00	2026-02-13 03:50:52.573243+00	cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N		TK-20260213-I1X6T	t	2026-02-13 03:52:10.794168+00	t	2026-02-13 03:53:44.520513+00	\N	2026-02-13 03:53:44.520513+00	on_time	terima kasih	2026-02-13 03:56:14.286685+00
\.


--
-- TOC entry 3773 (class 0 OID 17064)
-- Dependencies: 217
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.facilities (id, name, capacity, price, photo_url, is_active, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, description, location) FROM stdin;
8b6dd75a-f94d-4088-b6a1-c8595273fcc7	Auditorium	500	0.00	{/uploads/1769398781-0-audit1.jpg,/uploads/1769398781-1-audit2.jpg,/uploads/1769398781-2-audit3.jpg,/uploads/1769398781-3-audit4.jpg}	t	2026-01-26 03:26:20.488521+00	2026-01-26 03:39:41.06618+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruangan aula besar dengan kapasitas 500 kursi, dilengkapi sistem tata suara dolby, proyektor ganda, dan panggung utama. Biasa digunakan untuk seminar umum, kuliah tamu, dan acara wisuda fakultas.	Gedung A Lantai 1
1b76fdda-104b-4471-9e58-52dab1be681f	Laboratorium Komputer	50	0.00	{/uploads/1769398980-0-lab1.jpg}	t	2026-01-26 03:27:55.010864+00	2026-01-26 03:43:00.403828+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruang praktikum yang berisi 40 unit PC spesifikasi tinggi (i7, 32GB RAM) dengan jaringan LAN gigabit. Dikhususkan untuk mata kuliah pemrograman, desain grafis, dan data mining.	Gedung B Lantai 2
a623e819-6519-4092-b7b2-277921aa9230	Ruang Diskusi Perpustakaan	6	0.00	{/uploads/1769399160-0-perpus.jpg}	t	2026-01-26 03:30:08.685814+00	2026-01-26 03:46:00.354383+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruangan kedap suara berkapasitas 6 orang yang terletak di lantai 2 perpustakaan. Dilengkapi dengan whiteboard, meja bundar, dan saklar listrik, cocok untuk kerja kelompok atau bimbingan skripsi.	Gedung C Lantai 3
d76ca801-d61a-492e-9a91-09a6053eec40	Workshop Mesin Dasar	47	0.00	{/uploads/1769399432-0-mesin.jpg,"/uploads/1769399432-1-unnamed (1).jpg"}	t	2026-01-26 03:33:04.581878+00	2026-01-29 03:26:05.434404+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	Ruang bengkel luas dengan atap tinggi yang menampung mesin bubut, mesin bor duduk, dan area pengelasan. Wajib menggunakan APD (Alat Pelindung Diri) lengkap saat memasuki area ini.	Gedung D lantai 1
862728e3-3079-47f0-bfcb-dd20b9dc1497	tes	100	-2.00	{"/uploads/1770619335-0-Screenshot (1018).png","/uploads/1770619335-1-Screenshot (1022).png","/uploads/1770619335-2-Screenshot (1038).png"}	f	2026-02-09 06:42:15.825954+00	2026-02-09 07:53:37.695121+00	0b246bff-7316-4a63-81e0-eded4008a58d	0b246bff-7316-4a63-81e0-eded4008a58d	\N	\N	tes	lt 1
\.


--
-- TOC entry 3775 (class 0 OID 41680)
-- Dependencies: 219
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.profiles (id, user_id, full_name, phone_number, address, avatar_url, gender, identity_number, department, "position", created_at, updated_at) FROM stdin;
a1832b53-679a-48ef-96c8-f6bd96ccf8ab	a10e69c6-260a-4e38-b98e-ce1a091d7917	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 02:54:19.515034	2026-02-09 02:54:19.515034
b99d489f-076e-48e4-9054-9b0eee52b38f	2cd27c37-ec94-4b35-9131-d600dfdc9b23	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 02:58:20.419986	2026-02-09 03:01:14.309935
34e150f9-1dba-494d-8e13-419391c3ef50	d6d3afe9-3199-4753-8d85-cfd47270d1eb	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 03:01:40.970502	2026-02-09 03:35:27.639591
5272eb32-d168-41ae-861d-3744b1313606	cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-09 04:15:43.590373	2026-02-09 04:15:43.590373
42c7babb-9e32-46cf-9eb4-cdcc90c241f0	e3e6712e-dea1-4373-bd00-11497ad763af	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-10 03:10:45.358148	2026-02-10 03:10:45.358148
caf51685-e409-4ca3-a435-0294490c9b5d	b1bac792-0fcc-407d-8459-1071601956db	egergreg	087790239132		/uploads/1770953193-avatar.png	L	rhreh	rgregrh	rehreh	2026-02-13 03:23:35.18268	2026-02-13 03:26:33.413687
\.


--
-- TOC entry 3772 (class 0 OID 17051)
-- Dependencies: 216
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.users (id, name, email, password_hash, role, created_at, updated_at, created_by, updated_by, deleted_by, deleted_at, phone, is_phone_verified) FROM stdin;
0b246bff-7316-4a63-81e0-eded4008a58d	admin	admin@admin.com	$2a$10$2p73INV.IiFeNnc4BPmwk.YoIjFD16EDlPolroLlmlPTqrvKRyQty	admin	2026-01-22 09:23:55.959548+00	2026-01-22 09:23:55.959548+00	\N	\N	\N	\N	\N	f
a10e69c6-260a-4e38-b98e-ce1a091d7917	user1	user1@gmail.com	$2a$10$o6MpRevXeR/oHs/ME6.j0.UH5NbS8Ej.oRmUWVilrHG/lOE/kybB6	user	2026-02-09 02:54:19.504416+00	2026-02-09 02:54:19.504416+00	\N	\N	\N	\N	\N	f
2cd27c37-ec94-4b35-9131-d600dfdc9b23	rieffzy (Deleted 1770606074)	083199837037@phone.users.deleted_1770606074	$2a$10$iAfNFf2iA4l4Xh2zTAdK..Vn43TETNMNfrFBox749ybrBDfT02bxm	user	2026-02-09 02:58:20.407223+00	2026-02-09 02:58:20.407223+00	\N	\N	0b246bff-7316-4a63-81e0-eded4008a58d	2026-02-09 03:01:14.309935+00	083199837037.deleted_1770606074	t
d6d3afe9-3199-4753-8d85-cfd47270d1eb	user2 (Deleted 1770608128)	user2@test.com.deleted_1770608128	$2a$10$cjnWkBC..S/nGZ9ooicfN./Zo8CGQragwBeuCG6fjkW1tj6moR0nq	user	2026-02-09 03:01:40.857354+00	2026-02-09 03:01:40.857354+00	\N	\N	0b246bff-7316-4a63-81e0-eded4008a58d	2026-02-09 03:35:27.639591+00	\N	f
cfaf00eb-3dfb-4ef2-ad41-b5f7ced325b4	user2	user2@gmail.com	$2a$10$VuLUYMycUIq9xTrYxE8wLuGzy22RjwAtYMds3/5LnbHiJybclYSuS	user	2026-02-09 04:15:43.583184+00	2026-02-09 08:39:54.09416+00	\N	\N	\N	\N	\N	f
e3e6712e-dea1-4373-bd00-11497ad763af	user10	user10@gmail.com	$2a$10$dqr9MO36jqvW7wDdZL6uueITnuRZfqf9lwtbvbLJRgwKoWX.rsHWK	user	2026-02-10 03:10:45.337496+00	2026-02-10 03:10:45.337496+00	\N	\N	\N	\N	\N	f
b1bac792-0fcc-407d-8459-1071601956db	rieffzy	087790239132@phone.users	$2a$10$mDNIXUW3YLl/Mc.PwTo9QO4SexMD3zDgclgR1oe9yS2o2aVEbGs/S	user	2026-02-13 03:23:35.173029+00	2026-02-13 03:23:35.173029+00	\N	\N	\N	\N	087790239132	t
\.


--
-- TOC entry 3776 (class 0 OID 99024)
-- Dependencies: 220
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: campus_user
--

COPY public.verification_codes (id, phone_number, code, type, expiration_time, created_at, used_at) FROM stdin;
fa391554-2a9b-4441-9cc0-adb31a205b94	08	389153	register	2026-02-03 09:02:42.198125+00	2026-02-03 08:57:42.198125+00	\N
3762f66c-16ea-4837-988a-a60240e4b03b	083199837037	157051	register	2026-02-13 03:24:23.877527+00	2026-02-13 03:19:23.877527+00	\N
d5c41096-4ede-4e92-92b9-a3932ae3c552	083814132406	064011	register	2026-02-13 03:47:00.716476+00	2026-02-13 03:42:00.716476+00	\N
bcc304f1-6ae8-4fb9-a9c4-e151061cc2f3	089617540306	884327	register	2026-02-03 09:15:29.468345+00	2026-02-03 09:10:29.468345+00	\N
3aee1760-df16-4584-9a8f-c1f03ee4bbce	8u98798989080	280095	register	2026-02-04 02:41:41.032542+00	2026-02-04 02:36:41.032542+00	\N
321bc21e-7c05-4545-b2ba-a39e51b03467	dsxdsxdsx	419174	register	2026-02-08 05:00:01.034232+00	2026-02-08 04:55:01.034232+00	\N
3cc4f0c3-5cb3-4356-af35-120ef2cb9287	jnjnmkmkmk	740719	register	2026-02-08 05:03:17.444573+00	2026-02-08 04:58:17.444573+00	\N
1a79e287-01fe-4f36-a681-2a5f16eb4329	jknjknjm	340945	register	2026-02-08 05:18:06.011123+00	2026-02-08 05:13:06.011123+00	\N
85be0135-b4ae-4b98-9c39-17cd76406417	1234567890	238720	register	2026-02-08 05:36:29.261259+00	2026-02-08 05:31:29.261259+00	\N
d9d47c83-9744-47d7-a5af-6a7defda8fbd	081111111111	572191	register	2026-02-08 13:17:28.593089+00	2026-02-08 13:12:28.593089+00	\N
\.


--
-- TOC entry 3598 (class 2606 OID 17089)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 3600 (class 2606 OID 66272)
-- Name: bookings bookings_ticket_code_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_ticket_code_key UNIQUE (ticket_code);


--
-- TOC entry 3593 (class 2606 OID 17077)
-- Name: facilities facilities_name_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_name_key UNIQUE (name);


--
-- TOC entry 3595 (class 2606 OID 17075)
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- TOC entry 3607 (class 2606 OID 74450)
-- Name: bookings no_double_booking; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_double_booking EXCLUDE USING gist (facility_id WITH =, tstzrange(start_time, COALESCE(actual_end_time, end_time)) WITH &&) WHERE (((status = ANY (ARRAY['pending'::public.booking_status, 'approved'::public.booking_status])) AND (deleted_at IS NULL)));


--
-- TOC entry 3609 (class 2606 OID 41699)
-- Name: bookings no_user_overlap; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT no_user_overlap EXCLUDE USING gist (user_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE (((status = ANY (ARRAY['pending'::public.booking_status, 'approved'::public.booking_status])) AND (deleted_at IS NULL)));


--
-- TOC entry 3611 (class 2606 OID 41690)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3613 (class 2606 OID 41692)
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 3585 (class 2606 OID 17063)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3587 (class 2606 OID 107217)
-- Name: users users_name_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_name_key UNIQUE (name);


--
-- TOC entry 3589 (class 2606 OID 107219)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 3591 (class 2606 OID 17061)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3616 (class 2606 OID 99030)
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 3601 (class 1259 OID 74451)
-- Name: idx_bookings_auto_checkout; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_auto_checkout ON public.bookings USING btree (status, is_checked_in, is_checked_out, end_time) WHERE (status = 'approved'::public.booking_status);


--
-- TOC entry 3602 (class 1259 OID 25341)
-- Name: idx_bookings_created_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_created_by ON public.bookings USING btree (created_by);


--
-- TOC entry 3603 (class 1259 OID 25343)
-- Name: idx_bookings_deleted_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_deleted_by ON public.bookings USING btree (deleted_by);


--
-- TOC entry 3604 (class 1259 OID 66273)
-- Name: idx_bookings_ticket_code; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_ticket_code ON public.bookings USING btree (ticket_code);


--
-- TOC entry 3605 (class 1259 OID 25342)
-- Name: idx_bookings_updated_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_bookings_updated_by ON public.bookings USING btree (updated_by);


--
-- TOC entry 3596 (class 1259 OID 25344)
-- Name: idx_facilities_created_by; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_facilities_created_by ON public.facilities USING btree (created_by);


--
-- TOC entry 3614 (class 1259 OID 99031)
-- Name: idx_verification_codes_phone; Type: INDEX; Schema: public; Owner: campus_user
--

CREATE INDEX idx_verification_codes_phone ON public.verification_codes USING btree (phone_number);


--
-- TOC entry 3623 (class 2606 OID 25326)
-- Name: bookings bookings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3624 (class 2606 OID 25336)
-- Name: bookings bookings_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3625 (class 2606 OID 17095)
-- Name: bookings bookings_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- TOC entry 3626 (class 2606 OID 25331)
-- Name: bookings bookings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3627 (class 2606 OID 17090)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3620 (class 2606 OID 25311)
-- Name: facilities facilities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3621 (class 2606 OID 25321)
-- Name: facilities facilities_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3622 (class 2606 OID 25316)
-- Name: facilities facilities_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 3628 (class 2606 OID 41693)
-- Name: profiles fk_user; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3617 (class 2606 OID 25296)
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3618 (class 2606 OID 25306)
-- Name: users users_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 3619 (class 2606 OID 25301)
-- Name: users users_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: campus_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


-- Completed on 2026-02-13 13:33:27

--
-- PostgreSQL database dump complete
--

\unrestrict ZAvbrhcwFiVKnbIqYxWIApzWUHwt2LibcRb3Nsg3bEqZKCoIPcjmIkRubcdt22l

